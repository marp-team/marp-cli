/* eslint-disable @typescript-eslint/no-namespace */
import crypto from 'node:crypto'
import path from 'node:path'
import { watch as _watch, type FSWatcher } from 'chokidar'
import { getPortPromise } from 'portfinder'
import { WebSocketServer } from 'ws'
import type { ServerOptions } from 'ws'
import { Converter, ConvertedCallback } from './converter'
import { isError } from './error'
import { File, FileType } from './file'
import { debugWatcher, debugWatcherWS } from './utils/debug'

const chokidarWatch: typeof _watch = (...args) => {
  debugWatcher('Start watching with chokidar: %O', args)
  return _watch(...args)
}

export class Watcher {
  chokidar: FSWatcher

  readonly converter: Converter
  readonly events: Watcher.Events
  readonly finder: Watcher.Options['finder']
  readonly mode: Watcher.WatchMode

  private constructor(watchPath: string[], opts: Watcher.Options) {
    this.converter = opts.converter
    this.events = opts.events
    this.finder = opts.finder
    this.mode = opts.mode

    this.chokidar = chokidarWatch(watchPath, { ignoreInitial: true })
      .on('all', (event, path) => this.log(event, path))
      .on('change', (f) => this.convert(f))
      .on('add', (f) => this.convert(f))
      .on('unlink', (f) => this.delete(f))

    this.converter.options.themeSet.onThemeUpdated = (f) => this.convert(f)

    notifier.start()
  }

  private log(event: string, path: string) {
    debugWatcher('Chokidar event: [%s] %s', event, path)
  }

  private async convert(filename: string) {
    const resolvedFn = path.resolve(filename)
    const mdFiles = (await this.finder()).filter(
      (f) => path.resolve(f.path) === resolvedFn
    )
    const cssFile = (await this.converter.options.themeSet.findPath()).find(
      (f) => path.resolve(f) === resolvedFn
    )

    const notify = (f: File) => {
      if (f.type === FileType.File) notifier.sendTo(f.absolutePath, 'reload')
    }

    try {
      if (this.mode === Watcher.WatchMode.Convert) {
        // Convert markdown
        await this.converter.convertFiles(mdFiles, {
          onConverted: (ret) => {
            this.events.onConverted(ret)
            notify(ret.file)
          },
        })
      } else if (this.mode === Watcher.WatchMode.Notify) {
        // Notification only
        mdFiles.forEach(notify)
      }
    } catch (e: unknown) {
      if (isError(e)) this.events.onError(e)
    }

    // Reload Theme CSS
    if (cssFile !== undefined) this.converter.options.themeSet.load(resolvedFn)
  }

  private delete(filename: string) {
    const fn = path.resolve(filename)
    const { themeSet } = this.converter.options

    themeSet.unobserve(fn)
    themeSet.themes.delete(fn)
  }

  static watch(watchPath: string[], opts: Watcher.Options) {
    return new Watcher(watchPath, opts)
  }
}

export type WatchNotifierEntrypointType = 'static' | 'server'

export class WatchNotifier {
  listeners = new Map<string, Set<any>>()

  private wss?: WebSocketServer
  private portNumber?: number

  static readonly webSocketEntrypoint = '.__marp-cli-watch-notifier__'

  get server() {
    return this.wss
  }

  async port() {
    if (this.portNumber === undefined)
      this.portNumber = await getPortPromise({ port: 37717 })

    return this.portNumber
  }

  async register(
    fn: string,
    entrypointType: WatchNotifierEntrypointType = 'static'
  ) {
    const identifier = WatchNotifier.sha256(fn)

    if (!this.listeners.has(identifier))
      this.listeners.set(identifier, new Set())

    return await this.entrypoint(identifier, entrypointType)
  }

  async entrypoint(
    identifier: string,
    entrypointType: WatchNotifierEntrypointType = 'static'
  ) {
    if (entrypointType === 'server') {
      return `/${WatchNotifier.webSocketEntrypoint}/${identifier}`
    }

    const port = await this.port()
    return `ws://localhost:${port}/${identifier}`
  }

  sendTo(fn: string, command: string) {
    if (!this.wss) return false

    const sockets = this.listeners.get(WatchNotifier.sha256(fn))
    if (!sockets) return false

    sockets.forEach((ws) => ws.send(command))
    return true
  }

  async start(opts: ServerOptions = {}) {
    const port = await this.port()

    this.wss = new WebSocketServer({ ...opts, port })

    debugWatcherWS(
      'WebSocket server for watch notifier started on port %d.',
      port
    )

    this.wss.on('connection', (ws, sock) => {
      if (sock.url) {
        debugWatcherWS('New WebSocket connection: %s', sock.url)

        const identifier = (() => {
          try {
            const parsedUrl = new URL(sock.url, `ws://localhost:${port}`)
            const detectedIdentifier = parsedUrl.pathname.split('/').pop()

            debugWatcherWS(
              'Detected identifier from WebSocket connection: %s',
              detectedIdentifier
            )

            return detectedIdentifier
          } catch (e: unknown) {
            debugWatcherWS('Error occurred during parsing identifier: %o', e)
            return undefined
          }
        })()

        if (identifier) {
          const wsSet = this.listeners.get(identifier)

          if (wsSet !== undefined) {
            this.listeners.set(identifier, wsSet.add(ws))
            debugWatcherWS(
              'WebSocket connection for identifier "%s" registered',
              identifier
            )

            ws.on('close', () => {
              this.listeners.get(identifier)!.delete(ws)
              debugWatcherWS(
                'WebSocket connection for identifier "%s" closed',
                identifier
              )
            })

            ws.send('ready')
            return
          }
        }
      }

      debugWatcherWS(
        'WebSocket connection request has been dismissed: %s',
        sock.url
      )
      ws.close()
    })
  }

  async stop() {
    return new Promise<boolean>((resolve) => {
      if (this.wss !== undefined) {
        const { wss } = this

        wss.close(() => {
          for (const ws of wss.clients) ws.terminate()
          resolve(true)
        })

        this.wss = undefined
      } else {
        resolve(false)
      }
    })
  }

  static sha256(fn: string) {
    const hmac = crypto.createHash('sha256')
    hmac.update(fn)

    return hmac.digest('hex').toString()
  }
}

export const notifier = new WatchNotifier()

export default Watcher.watch

export namespace Watcher {
  export enum WatchMode {
    Convert,
    Notify,
  }

  export interface Options {
    converter: Converter
    events: Watcher.Events
    finder: () => Promise<File[]>
    mode: WatchMode
  }

  export interface Events {
    onConverted: ConvertedCallback
    onError: (e: Error) => void
  }
}

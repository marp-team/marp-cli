import chokidar from 'chokidar'
import crypto from 'crypto'
import path from 'path'
import portfinder from 'portfinder'
import { Server as WSServer, ServerOptions } from 'ws'
import { Converter, ConvertedCallback } from './converter'
import { File, FileType } from './file'

export class Watcher {
  chokidar: chokidar.FSWatcher

  readonly converter: Converter
  readonly events: Watcher.Events
  readonly finder: Watcher.Options['finder']
  readonly mode: Watcher.WatchMode

  private constructor(watchPath: string[], opts: Watcher.Options) {
    this.converter = opts.converter
    this.events = opts.events
    this.finder = opts.finder
    this.mode = opts.mode

    this.chokidar = chokidar
      .watch(watchPath, { disableGlobbing: true, ignoreInitial: true })
      .on('change', f => this.convert(f))
      .on('add', f => this.convert(f))
      .on('unlink', f => this.delete(f))

    this.converter.options.themeSet.onThemeUpdated = f => this.convert(f)

    notifier.start()
  }

  private async convert(filename: string) {
    const resolvedFn = path.resolve(filename)
    const mdFiles = (await this.finder()).filter(
      f => path.resolve(f.path) === resolvedFn
    )
    const cssFile = (await this.converter.options.themeSet.findPath()).find(
      f => path.resolve(f) === resolvedFn
    )

    const notify = (f: File) => {
      if (f.type === FileType.File) notifier.sendTo(f.absolutePath, 'reload')
    }

    try {
      if (this.mode === Watcher.WatchMode.Convert) {
        // Convert markdown
        await this.converter.convertFiles(mdFiles, {
          onConverted: ret => {
            this.events.onConverted(ret)
            notify(ret.file)
          },
        })
      } else if (this.mode === Watcher.WatchMode.Notify) {
        // Notification only
        mdFiles.forEach(notify)
      }
    } catch (e) {
      this.events.onError(e)
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

export class WatchNotifier {
  listeners: Map<string, Set<any>> = new Map()

  private wss?: WSServer
  private portNumber?: number

  async port() {
    if (this.portNumber === undefined)
      this.portNumber = await portfinder.getPortPromise({ port: 37717 })

    return this.portNumber
  }

  async register(fn: string) {
    const identifier = WatchNotifier.sha256(fn)

    if (!this.listeners.has(identifier))
      this.listeners.set(identifier, new Set())

    return `ws://localhost:${await this.port()}/${identifier}`
  }

  sendTo(fn: string, command: string) {
    if (!this.wss) return false

    const sockets = this.listeners.get(WatchNotifier.sha256(fn))
    if (!sockets) return false

    sockets.forEach(ws => ws.send(command))
    return true
  }

  async start(opts: ServerOptions = {}) {
    this.wss = new WSServer({ ...opts, port: await this.port() })
    this.wss.on('connection', (ws, sock) => {
      if (sock.url) {
        const [, identifier] = sock.url.split('/')
        const wsSet = this.listeners.get(identifier)

        if (wsSet !== undefined) {
          this.listeners.set(identifier, wsSet.add(ws))
          ws.on('close', () => this.listeners.get(identifier)!.delete(ws))

          ws.send('ready')
          return
        }
      }
      ws.close()
    })
  }

  stop() {
    if (this.wss !== undefined) {
      this.wss.close()
      this.wss = undefined
    }
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

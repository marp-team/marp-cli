import chalk from 'chalk'
import chokidar from 'chokidar'
import crypto from 'crypto'
import path from 'path'
import portfinder from 'portfinder'
import { Server as WSServer } from 'ws'
import * as cli from './cli'
import { Converter, ConvertedCallback } from './converter'
import { File, FileType } from './file'

export class Watcher {
  chokidar: chokidar.FSWatcher

  readonly converter: Converter
  readonly events: Watcher.Events
  readonly finder: Watcher.Options['finder']

  private constructor(watchPath: string | string[], opts: Watcher.Options) {
    this.converter = opts.converter
    this.finder = opts.finder
    this.events = opts.events

    this.chokidar = chokidar.watch(watchPath, { ignoreInitial: true })
    this.chokidar
      .on('change', f => this.convert(f))
      .on('add', f => this.convert(f))

    notifier.start()

    cli.info(chalk.green('[Watch mode] Start watching...'))
  }

  private async convert(fn) {
    const files = (await this.finder()).filter(
      f => path.resolve(f.path) === path.resolve(fn)
    )

    try {
      await this.converter.convertFiles(files, ret => {
        this.events.onConverted(ret)

        if (ret.file.type === FileType.File)
          notifier.sendTo(ret.file.absolutePath, 'reload')
      })
    } catch (e) {
      this.events.onError(e)
    }
  }

  static watch(watchPath: string | string[], opts: Watcher.Options) {
    return new Watcher(watchPath, opts)
  }
}

export class WatchNotifier {
  private wss?: WSServer
  private listeners: Map<string, any> = new Map()
  private portNumber?: number

  async port() {
    if (this.portNumber === undefined)
      this.portNumber = await portfinder.getPortPromise({ port: 52000 })

    return this.portNumber
  }

  async register(fn: string) {
    const identifier = WatchNotifier.generateIdentifier(fn)

    if (!this.listeners.has(identifier))
      this.listeners.set(identifier, undefined)

    return `ws://localhost:${await this.port()}/${identifier}`
  }

  sendTo(fn: string, command: string) {
    if (!this.wss) return false

    const ws = this.listeners.get(WatchNotifier.generateIdentifier(fn))
    if (!ws) return false

    ws.send(command)
    return true
  }

  async start() {
    this.wss = new WSServer({ port: await this.port() })
    this.wss.on('connection', (ws, sock) => {
      if (sock.url) {
        const [, identifier] = sock.url.split('/')

        if (this.listeners.has(identifier)) {
          this.listeners.set(identifier, ws)
          ws.send('ready')
          return
        }
      }
      ws.close()
    })
  }

  static generateIdentifier(fn: string) {
    const hmac = crypto.createHash('sha256')
    hmac.update(fn)

    return hmac.digest('hex').toString()
  }
}

export const notifier = new WatchNotifier()

export default Watcher.watch

export namespace Watcher {
  export interface Options {
    converter: Converter
    events: Watcher.Events
    finder: () => Promise<File[]>
  }

  export interface Events {
    onConverted: ConvertedCallback
    onError: (e: Error) => void
  }
}

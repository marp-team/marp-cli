import puppeteer from 'puppeteer-core'
import { File } from './file'
import TypedEventEmitter from './utils/typed-event-emitter'

// Patch for killing Chrome in Windows
const { launch } = puppeteer
puppeteer.launch = function(opts = {}) {
  // Leave decision of data directory to puppeteer
  return launch.call(this, { ...opts, userDataDir: null })
}

export const carlo = (() => {
  try {
    // tslint:disable-next-line:no-implicit-dependencies
    return require('carlo')
  } catch (e) {
    return undefined
  }
})()

export class PreviewManager extends TypedEventEmitter<PreviewManager.Events> {
  readonly options: PreviewManager.Options

  private carlo: any

  constructor(opts: Partial<PreviewManager.Options> = {}) {
    super()
    this.options = {
      height: opts.height || 360,
      width: opts.width || 640,
    }
  }

  async open(path: string) {
    const win = (await this.createWindow()) || (await this.launch())
    win.on('close', () => this.emit('close', win))

    await win.load(path)
    this.emit('open', win, path)
  }

  private async createWindow() {
    return (
      !!this.carlo &&
      (await this.carlo.createWindow({
        height: this.options.height,
        width: this.options.width,
      }))
    )
  }

  private async launch() {
    this.carlo = await carlo.launch({
      height: this.options.height,
      width: this.options.width,
      args: ['--enable-blink-gen-property-trees'],
      channel: ['canary', 'stable'],
      title: 'Marp CLI',
    })

    this.carlo.on('exit', () => {
      this.emit('exit')
      this.carlo = undefined
    })

    this.emit('launch')
    return await this.carlo.mainWindow()
  }
}

export namespace PreviewManager {
  export interface Options {
    height: number
    width: number
  }

  export interface Events {
    close(window: any): void
    exit(): void
    launch(): void
    open(window: any, path: string): void
  }
}

export abstract class Preview {
  private carlo: any
  readonly file: File

  constructor(file: File) {
    this.file = file
  }

  async open() {
    await this.close()

    this.carlo = await carlo.launch({
      channel: ['canary', 'stable'],
      title: 'Marp CLI',
      args: ['--enable-blink-gen-property-trees'],
    })

    await this.carlo.load(this.file.path)
  }

  async close() {
    if (this.carlo) await this.carlo.exit()
  }

  on(event: string, callback: Function): void {
    if (!this.carlo) throw new Error('Preview window is not yet initialized.')
    this.carlo.on(event, callback)
  }
}

export class FilePreview extends Preview {
  // TODO: Support multiple windows through regular file conversions if Carlo
  // could support to hide main window.
  //
  // @see https://github.com/GoogleChromeLabs/carlo/issues/53
}

export class ServerPreview extends Preview {
  private static encodeURIComponentRFC3986 = url =>
    encodeURIComponent(url).replace(
      /[!'()*]/g,
      c => `%${c.charCodeAt(0).toString(16)}`
    )

  constructor(url: string) {
    const encodedUrl = ServerPreview.encodeURIComponentRFC3986(url)
    const serverFile = `data:text/html,<html><head><meta http-equiv="refresh" content="0;URL='${encodedUrl}'" /></head></html>`

    super(new File(serverFile))
  }
}

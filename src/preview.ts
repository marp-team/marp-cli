import path from 'path'
import puppeteer from 'puppeteer-core'
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

export function fileURI(fn: string) {
  const uri = path.resolve(fn).replace(/\\/g, '/')
  return encodeURI(`file://${uri.startsWith('/') ? '' : '/'}${uri}`)
}

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

  async open(location: string) {
    this.emit('opening', location)

    const win = (await this.createWindow()) || (await this.launch())
    win.on('close', () => this.emit('close', win))

    await win.load(location)
    this.emit('open', win, location)
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
    open(window: any, location: string): void
    opening(location: string): void
  }
}

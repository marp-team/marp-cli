import puppeteer from 'puppeteer-core'
import { File, FileType } from './file'
import TypedEventEmitter from './utils/typed-event-emitter'
import { ConvertType } from './converter'
import { CLIError } from './error'

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

export class Preview extends TypedEventEmitter<Preview.Events> {
  readonly options: Preview.Options

  private carlo: any

  constructor(opts: Partial<Preview.Options> = {}) {
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

export namespace Preview {
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

const mimeTypes = {
  [ConvertType.html]: 'text/html',
  [ConvertType.pdf]: 'application/pdf',
}

export function fileToURI(file: File, type: ConvertType = ConvertType.html) {
  if (file.type === FileType.File) {
    // Convert path to file URI
    const uri = file.absolutePath.replace(/\\/g, '/')
    return encodeURI(`file://${uri.startsWith('/') ? '' : '/'}${uri}`)
  }

  if (file.type === FileType.StandardIO && file.buffer) {
    // Convert to data scheme URI
    return `data:${mimeTypes[type]};base64,${file.buffer.toString('base64')}`
  }

  throw new CLIError('Processing file is not convertible to URI for preview.')
}

import os from 'os'
import path from 'path'
import carlo from 'carlo'
import { File, FileType } from './file'
import { generatePuppeteerLaunchArgs } from './utils/puppeteer'
import TypedEventEmitter from './utils/typed-event-emitter'
import { ConvertType, mimeTypes } from './converter'
import { CLIError } from './error'
import favicon from './assets/favicon.png'

export class Preview extends TypedEventEmitter<Preview.Events> {
  readonly options: Preview.Options

  private carloInternal: any

  constructor(opts: Partial<Preview.Options> = {}) {
    super()
    this.options = {
      height: opts.height || 360,
      width: opts.width || 640,
    }
  }

  get carlo() {
    return this.carloInternal
  }

  async open(location: string) {
    this.emit('opening', location)

    const win = (await this.createWindow()) || (await this.launch())
    win.on('close', () => this.emit('close', win))

    await win.load(location)
    this.emit('open', win, location)

    // Override close function to ignore raising error if a target page has already close
    const { close } = win
    win.close = async () => {
      try {
        return await close.call(win)
      } catch (e) {
        if (!e.message.includes('Target closed.')) throw e
      }
    }

    return win
  }

  private async createWindow() {
    if (!this.carlo) return false

    return await this.carlo.createWindow({
      height: this.options.height,
      width: this.options.width,
    })
  }

  private async launch() {
    this.carloInternal = await carlo.launch({
      localDataDir: path.resolve(os.tmpdir(), './marp-cli-carlo'),
      args: [
        // Puppeteer >= v1.13.0 cannot use BGPT due to crbug.com/937609.
        // https://github.com/GoogleChrome/puppeteer/blob/master/lib/Launcher.js
        //
        // Related bug is affected only in capturing, so we override
        // `--disable-features` option to prevent disabling BGPT.
        '--disable-features=TranslateUI',
      ],
      height: this.options.height,
      width: this.options.width,
      executablePath: generatePuppeteerLaunchArgs().executablePath,
      icon: Buffer.from(favicon.slice(22), 'base64'),
      title: 'Marp CLI',
    })

    this.carlo.once('exit', () => {
      this.emit('exit')
      this.carloInternal = undefined
    })

    this.emit('launch')
    return await this.carlo.mainWindow()
  }
}

export namespace Preview {
  export interface Events {
    close(window: any): void
    exit(): void
    launch(): void
    open(window: any, location: string): void
    opening(location: string): void
  }

  export interface Options {
    height: number
    width: number
  }
}

export function fileToURI(file: File, type: ConvertType) {
  if (file.type === FileType.File) {
    // Convert path to file URI
    const uri = file.absolutePath.replace(/\\/g, '/')
    return encodeURI(`file://${uri.startsWith('/') ? '' : '/'}${uri}`)
  }

  if (file.buffer) {
    // Convert to data scheme URI
    return `data:${mimeTypes[type]};base64,${file.buffer.toString('base64')}`
  }

  throw new CLIError('Processing file is not convertible to URI for preview.')
}

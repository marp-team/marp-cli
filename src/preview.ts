import os from 'os'
import path from 'path'
import carlo from 'carlo'
import { File, FileType } from './file'
import TypedEventEmitter from './utils/typed-event-emitter'
import { ConvertType } from './converter'
import { CLIError } from './error'
import favicon from './assets/favicon.png'

const mimeTypes = {
  [ConvertType.html]: 'text/html',
  [ConvertType.pdf]: 'application/pdf',
  [ConvertType.png]: 'image/png',
  [ConvertType.jpeg]: 'image/jpeg',
}

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
        // Fix wrong rendered position of elements in <foreignObject>
        // https://bugs.chromium.org/p/chromium/issues/detail?id=467484
        '--enable-blink-gen-property-trees',

        // Puppeteer >= v1.13.0 cannot use BGPT due to crbug.com/937609.
        // https://github.com/GoogleChrome/puppeteer/commit/ef2251d7a722bcd6d183f7876673224ac58f2244
        //
        // Related bug is affected only in capturing, so we override
        // `--disable-features` option to prevent disabling BGPT.
        '--disable-features=site-per-process,TranslateUI',
      ],
      height: this.options.height,
      width: this.options.width,
      channel: ['canary', 'stable'],
      icon: Buffer.from(favicon.slice(22), 'base64'),
      title: 'Marp CLI',
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

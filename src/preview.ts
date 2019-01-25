import carlo from 'carlo'
import terminate from 'terminate'
import { File, FileType } from './file'
import TypedEventEmitter from './utils/typed-event-emitter'
import { ConvertType } from './converter'
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

    win.on('close', () => {
      this.emit('close', win)

      // Workaround for unresolved close event in Windows
      // @see https://github.com/GoogleChromeLabs/carlo/issues/108
      if (process.platform === 'win32' && this.carlo.windows().length === 0) {
        const browser = this.carlo.browserForTest()
        terminate(browser.process().pid)
      }
    })

    await win.load(location)
    this.emit('open', win, location)

    return win
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
    const args = ['--enable-blink-gen-property-trees']
    if (process.env.CI) args.push('--disable-dev-shm-usage')

    this.carloInternal = await carlo.launch({
      args,
      height: this.options.height,
      width: this.options.width,
      channel: ['canary', 'stable'],
      icon: Buffer.from(favicon.slice(22), 'base64'),
      title: 'Marp CLI',
    })

    this.carlo.on('exit', () => {
      this.emit('exit')
      this.carloInternal = undefined
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

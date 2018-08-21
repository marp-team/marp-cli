import { MarpOptions } from '@marp-team/marp-core'
import { Marpit, MarpitRenderResult, MarpitOptions } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import { CLIError, error } from './error'
import templates from './templates'

export interface ConverterOption {
  engine: MarpitEngine | string
  engineName: string
  options: MarpOptions | MarpitOptions
  output?: string
  template: string
  theme?: string
}

export interface ConvertResult {
  output: string
  path: string
  rendered: MarpitRenderResult
  result: string
}

type MarpitEngine = new (opts?: MarpitOptions) => Marpit

export class Converter {
  readonly engine!: MarpitEngine
  readonly options: ConverterOption

  constructor(opts: ConverterOption) {
    this.options = opts

    try {
      this.engine =
        typeof opts.engine === 'string'
          ? <MarpitEngine>require(opts.engine)[opts.engineName]
          : opts.engine
    } catch (err) {
      if (err instanceof CLIError) throw err
      error(`Failed to resolve engine. (${err.message})`)
    }
  }

  get renderer() {
    const renderer = new this.engine(this.options.options)
    if (!(renderer instanceof Marpit))
      error('Specified engine has not extended from Marpit framework.')

    return renderer
  }

  get template() {
    const template = templates[this.options.template]
    if (!template) error(`Template "${this.options.template}" is not found.`)

    return template
  }

  convert(markdown: string) {
    const { options, theme } = this.options

    let additionals = ''
    if (theme) additionals += `\n<!-- theme: ${JSON.stringify(theme)} -->`

    return this.template({
      options,
      markdown: `${markdown}${additionals}`,
      engine: this.engine,
    })
  }

  async convertFile(path: string): Promise<ConvertResult> {
    const buffer = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(path, (e, data) => (e ? reject(e) : resolve(data)))
    )

    const converted = this.convert(buffer.toString())
    const output = this.outputPath(path)

    if (output !== '-') {
      await new Promise<void>((resolve, reject) =>
        fs.writeFile(output, converted.result, e => (e ? reject(e) : resolve()))
      )
    }

    return {
      output,
      path,
      rendered: converted.rendered,
      result: converted.result,
    }
  }

  convertFiles(...files: string[]) {
    if (this.options.output && this.options.output !== '-' && files.length > 1)
      error('Output path cannot specify with processing multiple files')

    return Promise.all(files.map(fn => this.convertFile(fn)))
  }

  private outputPath(from: string, extension = 'html'): string {
    if (this.options.output) return this.options.output

    return path.join(
      path.dirname(from),
      `${path.basename(from, path.extname(from))}.${extension}`
    )
  }
}

import { Marpit, MarpitRenderResult, MarpitOptions } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import { error } from './error'
import templates from './templates'

export interface ConverterOption {
  engine: typeof Marpit
  options: MarpitOptions
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

export class Converter {
  readonly options: ConverterOption

  constructor(opts: ConverterOption) {
    this.options = opts
  }

  get template() {
    const template = templates[this.options.template]
    if (!template) error(`Template "${this.options.template}" is not found.`)

    return template
  }

  convert(markdown: string) {
    let additionals = ''

    if (this.options.theme)
      additionals += `\n<!-- theme: ${JSON.stringify(this.options.theme)} -->`

    return this.template({
      renderer: tplOpts =>
        this.generateEngine(tplOpts).render(`${markdown}${additionals}`),
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

  private generateEngine(mergeOptions: MarpitOptions) {
    const engine = new this.options.engine({
      ...this.options.options,
      ...mergeOptions,
    })

    if (typeof engine.render !== 'function')
      error('Specified engine has not implemented render() method.')

    return engine
  }

  private outputPath(from: string, extension = 'html'): string {
    if (this.options.output) return this.options.output

    return path.join(
      path.dirname(from),
      `${path.basename(from, path.extname(from))}.${extension}`
    )
  }
}

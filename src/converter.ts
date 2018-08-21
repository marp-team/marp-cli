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
  template: string
}

export interface ConvertResult {
  newPath: string
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

  async convertFile(fn: string): Promise<ConvertResult> {
    const markdown = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(fn, (err, data) => (err ? reject(err) : resolve(data)))
    )

    const newFn = path.join(
      path.dirname(fn),
      `${path.basename(fn, path.extname(fn))}.html`
    )

    const converted = this.template({
      engine: this.engine,
      markdown: markdown.toString(),
      options: this.options.options,
    })

    return new Promise<ConvertResult>((resolve, reject) =>
      fs.writeFile(
        newFn,
        converted.result,
        err =>
          err
            ? reject(err)
            : resolve({
                result: converted.result,
                rendered: converted.rendered,
                newPath: newFn,
                path: fn,
              })
      )
    )
  }

  convertFiles(...files: string[]) {
    return Promise.all(files.map(fn => this.convertFile(fn)))
  }
}

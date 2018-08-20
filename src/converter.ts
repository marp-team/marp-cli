import { Marpit, MarpitRenderResult, MarpitOptions } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import { compileTemplate } from 'pug'
import { CLIError, error } from './error'
import templates from './templates'

export interface ConverterOption {
  engine: MarpitEngine | string
  engineName: string
  template: string
}

export interface ConvertResult {
  newPath: string
  path: string
  result: MarpitRenderResult
}

type MarpitEngine = new (opts?: MarpitOptions) => Marpit

const { log } = console

export class Converter {
  readonly engine!: Marpit
  readonly options: ConverterOption
  readonly template: compileTemplate

  constructor(opts: ConverterOption) {
    this.options = opts

    try {
      // Resolve Marp engine
      const specifiedEngine =
        typeof opts.engine === 'string'
          ? <MarpitEngine>require(opts.engine)[opts.engineName]
          : opts.engine

      this.engine = new specifiedEngine({
        inlineSVG: true,
        container: [],
        slideContainer: [],
      })
    } catch (err) {
      if (err instanceof CLIError) throw err
      error(`Failed to resolve engine. (${err.message})`)
    }

    if (!(this.engine instanceof Marpit))
      error('Specified engine has not extended from Marpit framework.')

    this.template = templates[opts.template]
    if (!this.template) error(`Template "${opts.template}" is not found.`)
  }

  async convertFile(fn: string): Promise<ConvertResult> {
    const markdown = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(fn, (err, data) => (err ? reject(err) : resolve(data)))
    )

    const newFn = path.join(
      path.dirname(fn),
      `${path.basename(fn, path.extname(fn))}.html`
    )

    const result = this.engine.render(markdown.toString())

    return new Promise<ConvertResult>((resolve, reject) =>
      fs.writeFile(
        newFn,
        this.template(result),
        err =>
          err ? reject(err) : resolve({ result, newPath: newFn, path: fn })
      )
    )
  }

  convertFiles(...files: string[]) {
    return Promise.all(files.map(fn => this.convertFile(fn)))
  }
}

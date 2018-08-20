import { Marpit } from '@marp-team/marpit'
import { compileTemplate } from 'pug'
import { CLIError } from './error'
import bareTemplate from './templates/bare.pug'

export interface ConverterOption {
  engine: MarpitEngine | string
  engineName: string
  template: string
}

type MarpitEngine = new (opts?: {}) => Marpit

const { log } = console

function error(msg: string, errorCode = 1): never {
  throw new CLIError(msg, errorCode)
}

export class Converter {
  readonly engine!: Marpit
  readonly options: ConverterOption

  readonly templates: { [name: string]: compileTemplate } = {
    bare: bareTemplate,
  }

  constructor(public opts: ConverterOption) {
    this.options = opts

    try {
      // Resolve Marp engine
      const specifiedEngine =
        typeof opts.engine === 'string'
          ? <MarpitEngine>require(opts.engine)[opts.engineName]
          : opts.engine

      this.engine = new specifiedEngine()
    } catch (err) {
      if (err instanceof CLIError) throw err
      error(`Failed to resolve engine. (${err.message})`)
    }

    if (!(this.engine instanceof Marpit))
      error('Specified engine has not extended from Marpit framework.')

    if (!this.templates.hasOwnProperty(opts.template))
      error(`Selected template "${opts.template}" is not found.`)
  }

  get template() {
    return this.templates[this.options.template]
  }

  convert(...files: string[]) {
    if (files.length === 0) error('Please specify input markdown files.')

    // TODO: Convert markdown files and save into HTML by using bare template
    log(this.template(this.engine.render('# <!--fit--> Hello, marp-cli!')))
  }
}

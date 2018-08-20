import { Marpit } from '@marp-team/marpit'
import Marp from '@marp-team/marp-core'
import { CLIError } from './error'

export interface ConverterOption {
  engine: MarpitEngine | string
  engineName: string
}

type MarpitEngine = new () => Marpit

export class Converter {
  readonly engine: MarpitEngine
  readonly options: ConverterOption

  constructor(public opts: ConverterOption) {
    this.options = opts

    const { engine, engineName } = opts

    try {
      // Resolve Marp engine
      const specifiedEngine =
        typeof engine === 'string'
          ? <MarpitEngine>require(engine)[engineName]
          : engine

      if (!(new specifiedEngine() instanceof Marpit)) {
        throw new CLIError(
          'Specified engine has not extended from Marpit framework.'
        )
      }

      this.engine = specifiedEngine
    } catch (err) {
      throw err instanceof CLIError
        ? err
        : new CLIError(`Failed to resolve engine. (${err.message})`)
    }
  }
}

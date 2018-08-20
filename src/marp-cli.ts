import { Marp } from '@marp-team/marp-core'
import { version as coreVersion } from '@marp-team/marp-core/package.json'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import { Converter, ConverterOption } from './converter'
import { CLIError } from './error'
import { name, version } from '../package.json'

export default async function(argv: string[] = []): Promise<number> {
  try {
    const cli: Argv = yargs(argv)

    const args = cli
      .alias('help', 'h')
      .version(
        'version',
        'Show package versions',
        `${name} v${version} (/w @marp-team/marp-core v${coreVersion})`
      )
      .alias('version', 'v')
      .option('engine', {
        describe: 'Engine module to conversion',
        type: 'string',
      })
      .option('engineName', {
        describe: "Engine module's exported name",
        type: 'string',
      }).argv

    const converter = new Converter({
      engine: args.engine || Marp,
      engineName: args.engineName || 'default',
    })
  } catch (e) {
    if (e instanceof CLIError) {
      console.error(`[ERROR] ${e.message}`)
      return e.errorCode
    }
    throw e
  }
}

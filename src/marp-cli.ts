import { Argv } from 'yargs'
import yargs from 'yargs/yargs'

const { name, version } = require('../package.json')
const corePkg = require('@marp-team/marp-core/package.json')

export default async (argv: string[] = []): Promise<number> => {
  const cli: Argv = yargs(argv)
  const args = cli
    .alias('help', 'h')
    .version(
      'version',
      'Show package versions',
      `${name} v${version} (/w ${corePkg.name} v${corePkg.version})`
    )
    .alias('version', 'v').argv

  return 1
}

import { version as coreVersion } from '@marp-team/marp-core/package.json'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import { name, version } from '../package.json'

export default async function(argv: string[] = []): Promise<number> {
  const cli: Argv = yargs(argv)
  const args = cli
    .alias('help', 'h')
    .version(
      'version',
      'Show package versions',
      `${name} v${version} (/w @marp-team/marp-core v${coreVersion})`
    )
    .alias('version', 'v').argv

  return 1
}

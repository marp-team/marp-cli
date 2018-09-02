import cosmiconfig, { CosmiconfigResult } from 'cosmiconfig'
import { CLIError } from './error'

const moduleName = 'marp'

export default async function load(path?: string) {
  const explorer = cosmiconfig(moduleName)

  let ret: CosmiconfigResult

  try {
    ret = await (path === undefined ? explorer.search() : explorer.load(path))
  } catch (e) {
    throw new CLIError(
      [
        'Could not find or parse configuration file.',
        e.name !== 'Error' && `(${e.name})`,
        path !== undefined && `[${path}]`,
      ]
        .filter(m => m)
        .join(' ')
    )
  }

  return ret
}

import { version as bundledCoreVer } from '@marp-team/marp-core/package.json'
import { name, version } from '../package.json'
import { MarpCLIConfig } from './config'
import { ResolvedEngine } from './engine'

export const isMarpCore = async (engine: ResolvedEngine): Promise<boolean> =>
  engine.package?.name === '@marp-team/marp-core' ||
  engine === (await ResolvedEngine.resolveDefaultEngine())

export default async function outputVersion(config: MarpCLIConfig): Promise<0> {
  let engineVer = ''
  const { engine } = config

  if (await isMarpCore(engine)) {
    engineVer = `@marp-team/marp-core v${bundledCoreVer}`

    if (engine.package && engine.package.version !== bundledCoreVer) {
      engineVer = `user-installed @marp-team/marp-core v${engine.package.version}`
    }
  } else if (engine.package?.name && engine.package.version) {
    engineVer = `customized engine in ${engine.package.name} v${engine.package.version}`
  } else {
    engineVer = `customized engine`
  }

  console.log(`${name} v${version}${engineVer ? ` (w/ ${engineVer})` : ''}`)
  return 0
}

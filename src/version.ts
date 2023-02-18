import { version as bundledCoreVer } from '@marp-team/marp-core/package.json'
import { name, version } from '../package.json'
import { MarpCLIConfig } from './config'
import { ResolvedEngine } from './engine'

export const isMarpCore = async (engine: ResolvedEngine): Promise<boolean> =>
  (await engine.getPackage())?.name === '@marp-team/marp-core' ||
  engine === (await ResolvedEngine.resolveDefaultEngine())

export default async function outputVersion(config: MarpCLIConfig): Promise<0> {
  let engineVer = ''

  const { engine } = config
  const enginePackage = await engine.getPackage()

  if (await isMarpCore(engine)) {
    engineVer = `@marp-team/marp-core v${bundledCoreVer}`

    if (enginePackage && enginePackage.version !== bundledCoreVer) {
      engineVer = `user-installed @marp-team/marp-core v${enginePackage.version}`
    }
  } else if (enginePackage?.name && enginePackage.version) {
    engineVer = `customized engine in ${enginePackage.name} v${enginePackage.version}`
  } else {
    engineVer = `customized engine`
  }

  console.log(`${name} v${version}${engineVer ? ` (w/ ${engineVer})` : ''}`)
  return 0
}

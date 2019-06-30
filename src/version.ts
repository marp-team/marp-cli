import { Marp } from '@marp-team/marp-core'
import { version as bundledCoreVer } from '@marp-team/marp-core/package.json'
import { MarpCLIConfig } from './config'
import { name, version } from '../package.json'

export const isMarpCore = (klass: any): boolean => klass === Marp

export default async function outputVersion(config: MarpCLIConfig): Promise<0> {
  let engineVer = ''
  const { engine } = config

  if (isMarpCore(engine.klass)) {
    engineVer = `bundled @marp-team/marp-core v${bundledCoreVer}`

    if (engine.package && engine.package.version !== bundledCoreVer) {
      engineVer = `user-installed @marp-team/marp-core v${engine.package.version}`
    }
  } else if (engine.package && engine.package.name && engine.package.version) {
    engineVer = `customized engine in ${engine.package.name} v${engine.package.version}`
  } else {
    engineVer = `customized engine`
  }

  console.log(`${name} v${version}${engineVer ? ` (w/ ${engineVer})` : ''}`)
  return 0
}

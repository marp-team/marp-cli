import { Marp } from '@marp-team/marp-core'
import { version as bundledCoreVer } from '@marp-team/marp-core/package.json'
import { MarpCLIConfig } from './config'
import { name, version } from '../package.json'

export default async function outputVersion(config: MarpCLIConfig): Promise<0> {
  const { engine } = config
  let coreVer = ''

  if (engine.klass === Marp) {
    coreVer = `bundled @marp-team/marp-core v${bundledCoreVer}`

    if (engine.package && engine.package.version !== bundledCoreVer) {
      coreVer = `user-installed @marp-team/marp-core v${engine.package.version}`
    }
  } else if (engine.package && engine.package.name && engine.package.version) {
    coreVer = `customized engine in ${engine.package.name} v${engine.package.version}`
  } else {
    coreVer = `customized engine`
  }

  console.log(`${name} v${version}${coreVer ? ` (w/ ${coreVer})` : ''}`)
  return 0
}

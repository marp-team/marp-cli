import { Marp } from '@marp-team/marp-core'
import { version as bundledCoreVer } from '@marp-team/marp-core/package.json'
import { MarpCLIConfig } from './config'
import { name, version } from '../package.json'

export default async function outputVersion(config: MarpCLIConfig): Promise<0> {
  let message = `${name} v${version} `
  const { engine } = config

  if (engine.klass === Marp) {
    message += `(/w bundled @marp-team/marp-core v${bundledCoreVer})`
  } else if (engine.package && engine.package.name && engine.package.version) {
    message += `(/w customized engine in ${engine.package.name} v${
      engine.package.version
    })`
  } else {
    message += `(/w customized engine)`
  }

  console.log(message)
  return 0
}

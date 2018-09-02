import cosmiconfig, { CosmiconfigResult } from 'cosmiconfig'
import path from 'path'
import { ConverterOption } from './converter'
import { CLIError } from './error'

export interface IMarpCLIConfig {
  engine?: ConverterOption['engine']
  html?: ConverterOption['html']
  lang?: string
  options?: ConverterOption['options']
  output?: string
  pdf?: boolean
  template?: string
  theme?: string
}

export class MarpCLIConfig {
  private static moduleName = 'marp'

  static async loadConfig(path?: string): Promise<MarpCLIConfig> {
    const explorer = cosmiconfig(MarpCLIConfig.moduleName)
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

    return new MarpCLIConfig(ret)
  }

  readonly filePath?: string = undefined
  readonly config: IMarpCLIConfig = {}

  private constructor(confRet?: CosmiconfigResult) {
    if (confRet) {
      this.filePath = confRet.filepath
      this.config = <IMarpCLIConfig>confRet.config

      // Resolve the relative output path from config file
      if (this.config.output !== undefined) {
        this.config.output = path.resolve(
          path.dirname(this.filePath),
          this.config.output
        )
      }
    }
  }
}

export default MarpCLIConfig.loadConfig

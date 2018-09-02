import cosmiconfig, { CosmiconfigResult } from 'cosmiconfig'
import fs from 'fs'
import path from 'path'
import { ConverterOption } from './converter'
import { CLIError } from './error'

export interface IMarpCLIConfig {
  engine?: ConverterOption['engine'] | string
  html?: ConverterOption['html']
  lang?: string
  options?: ConverterOption['options']
  output?: string
  pdf?: boolean
  template?: string
  theme?: string
}

interface MarpCLINormalizedConfig extends IMarpCLIConfig {
  engine?: ConverterOption['engine']
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
  readonly config: MarpCLINormalizedConfig = {}

  private constructor(confRet?: CosmiconfigResult) {
    if (confRet) {
      this.filePath = confRet.filepath

      const dirPath = path.dirname(this.filePath)
      const config = { ...confRet.config } as IMarpCLIConfig

      // Resolve the relative output path from config file
      if (config.output !== undefined)
        config.output = path.resolve(dirPath, config.output)

      // Load engine dynamically
      if (typeof config.engine === 'string') {
        const engine = requireFrom(dirPath, config.engine)
        config.engine = engine && engine.__esModule ? engine.default : engine
      }

      this.config = config as MarpCLINormalizedConfig
    }
  }
}

export default MarpCLIConfig.loadConfig

function requireFrom(directory: string, moduleName: string) {
  const resolvedPath = (() => {
    let dir = directory
    let previousDir

    while (dir !== previousDir) {
      const resolvedDir = path.resolve(dir, './node_modules/')
      if (module.paths.includes(resolvedDir)) break

      const modulePath = path.resolve(resolvedDir, moduleName)

      try {
        fs.accessSync(modulePath)
        return modulePath
      } catch (e) {}

      previousDir = dir
      dir = path.dirname(dir)
    }

    return moduleName
  })()

  return require(resolvedPath)
}

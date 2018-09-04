import { Marp } from '@marp-team/marp-core'
import cosmiconfig, { CosmiconfigResult } from 'cosmiconfig'
import fs from 'fs'
import path from 'path'
import pkgUp from 'pkg-up'
import resolveFrom from 'resolve-from'
import { ConverterOption } from './converter'
import { CLIError } from './error'

export interface IMarpCLIConfig {
  allowLocalFiles?: boolean
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
  engine: ConverterOption['engine']
}

const defaultConfig: MarpCLINormalizedConfig = {
  engine: Marp,
}

export class MarpCLIConfig {
  private static moduleName = 'marp'
  private static browserScriptKey = 'marpBrowser'

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

  readonly config: MarpCLINormalizedConfig = { ...defaultConfig }
  readonly filePath?: string = undefined

  async loadBrowserScript(): Promise<string | undefined> {
    if (this.browserScript) return this.browserScript
    if (this.engineModuleId === undefined) return undefined

    // Resolve package path
    const pkgPath: string | null = await pkgUp(
      path.dirname(this.engineModuleId)
    )
    if (!pkgPath) return undefined

    // Read browser script key
    const marpBrowser = require(pkgPath)[MarpCLIConfig.browserScriptKey]
    if (!marpBrowser) return undefined

    // Load script
    const scriptBody = await new Promise<string>((res, rej) =>
      fs.readFile(
        path.resolve(path.dirname(pkgPath), marpBrowser),
        (e, buf) => (e ? rej(e) : res(buf.toString()))
      )
    )

    this.browserScript = `<script defer>${scriptBody}</script>`
    return this.browserScript
  }

  private browserScript?: string
  private engineModuleId?: string

  private constructor(confRet?: CosmiconfigResult) {
    if (confRet) {
      this.filePath = confRet.filepath

      const dirPath = path.dirname(this.filePath)
      const config = { ...this.config, ...confRet.config } as IMarpCLIConfig

      // Resolve the relative output path from config file
      if (config.output !== undefined)
        config.output = path.resolve(dirPath, config.output)

      // Load engine dynamically
      if (typeof config.engine === 'string') {
        let resolved

        try {
          resolved =
            resolveFrom.silent(dirPath, config.engine) ||
            require.resolve(config.engine)
        } catch (e) {
          throw new CLIError(
            `The specified engine "${config.engine}" has not resolved. (${
              e.message
            })`
          )
        }

        config.engine = resolved
          ? (() => {
              const required = require(resolved)
              return required && required.__esModule
                ? required.default
                : required
            })()
          : undefined

        if (resolved) this.engineModuleId = resolved
      }

      this.config = config as MarpCLINormalizedConfig
    }

    if (this.config.engine && !this.engineModuleId) {
      // Resolve engine's module id
      for (const moduleId in require.cache) {
        const expt = require.cache[moduleId].exports

        if (
          expt === this.config.engine ||
          (expt &&
            expt.__esModule &&
            Object.keys(expt)
              .map(k => expt[k])
              .includes(this.config.engine))
        ) {
          this.engineModuleId = moduleId
          break
        }
      }
    }
  }
}

export default MarpCLIConfig.loadConfig

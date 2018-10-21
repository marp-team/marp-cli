import { Marp } from '@marp-team/marp-core'
import chalk from 'chalk'
import cosmiconfig from 'cosmiconfig'
import path from 'path'
import fs from 'fs'
import osLocale from 'os-locale'
import promisify from 'util.promisify'
import { info, warn } from './cli'
import { ConverterOption, ConvertType } from './converter'
import resolveEngine, { ResolvableEngine } from './engine'
import { CLIError } from './error'
import { Theme, ThemeSet } from './theme'

const lstat = promisify(fs.lstat)

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type Overwrite<T, U> = Omit<T, Extract<keyof T, keyof U>> & U

export interface IMarpCLIArguments {
  _?: string[]
  allowLocalFiles?: boolean
  configFile?: string
  engine?: string
  html?: boolean
  inputDir?: string
  output?: string
  pdf?: boolean
  server?: boolean
  template?: string
  theme?: string
  themeSet?: string[]
  watch?: boolean
}

export type IMarpCLIConfig = Overwrite<
  Omit<IMarpCLIArguments, 'configFile' | '_'>,
  {
    engine?: ResolvableEngine | ResolvableEngine[]
    html?: ConverterOption['html']
    lang?: string
    options?: ConverterOption['options']
    themeSet?: string | string[]
  }
>

export class MarpCLIConfig {
  args: IMarpCLIArguments = {}
  conf: IMarpCLIConfig = {}
  confPath?: string

  static moduleName = 'marp'

  static async fromArguments(args: IMarpCLIArguments) {
    const conf = new MarpCLIConfig()
    conf.args = args

    await conf.loadConf(args.configFile)
    return conf
  }

  async converterOption(): Promise<ConverterOption> {
    const engine = await (() => {
      if (this.args.engine) return resolveEngine(this.args.engine)
      if (this.conf.engine)
        return resolveEngine(this.conf.engine, this.confPath)

      return resolveEngine(['@marp-team/marp-core', Marp])
    })()

    const inputDir = await this.inputDir()
    const output =
      this.args.output ||
      (this.conf.output
        ? (() => {
            if (this.conf.output === '-') return '-'
            return path.resolve(path.dirname(this.confPath!), this.conf.output)
          })()
        : undefined)

    const server = this.pickDefined(this.args.server, this.conf.server) || false

    const theme = await this.loadTheme()
    const initialThemes = theme instanceof Theme ? [theme] : []

    const themeSetPathes =
      this.args.themeSet ||
      (this.conf.themeSet
        ? (Array.isArray(this.conf.themeSet)
            ? this.conf.themeSet
            : [this.conf.themeSet]
          ).map(f => path.resolve(path.dirname(this.confPath!), f))
        : [])

    const themeSet = await ThemeSet.initialize(
      (inputDir ? [inputDir] : []).concat(themeSetPathes),
      initialThemes
    )

    if (
      themeSet.themes.size <= initialThemes.length &&
      themeSetPathes.length > 0
    )
      warn('Not found additional theme CSS files.')

    return {
      inputDir,
      output,
      server,
      themeSet,
      allowLocalFiles:
        this.pickDefined(
          this.args.allowLocalFiles,
          this.conf.allowLocalFiles
        ) || false,
      engine: engine.klass,
      html: this.pickDefined(this.args.html, this.conf.html),
      lang: this.conf.lang || (await osLocale()).replace(/[_@]/g, '-'),
      options: this.conf.options || {},
      readyScript: engine.browserScript
        ? `<script defer>${engine.browserScript}</script>`
        : undefined,
      template: this.args.template || this.conf.template || 'bespoke',
      theme: theme instanceof Theme ? theme.name : theme,
      type:
        this.args.pdf ||
        this.conf.pdf ||
        `${output}`.toLowerCase().endsWith('.pdf')
          ? ConvertType.pdf
          : ConvertType.html,
      watch:
        this.pickDefined(this.args.watch, this.conf.watch) || server || false,
    }
  }

  get files() {
    return this.args.server || this.conf.server ? [] : this.args._ || []
  }

  private async inputDir(): Promise<string | undefined> {
    const dir = (() => {
      if (this.args.inputDir) return path.resolve(this.args.inputDir)
      if (this.conf.inputDir)
        return path.resolve(path.dirname(this.confPath!), this.conf.inputDir)

      // Fallback to input arguments in server mode
      if (this.args.server || this.conf.server) {
        if (Array.isArray(this.args._)) {
          if (this.args._.length > 1)
            throw new CLIError(
              'Server mode have to specify just one directory.'
            )
          if (this.args._.length === 1) return path.resolve(this.args._[0])
        }
      }
    })()
    if (dir === undefined) return undefined

    let stat: fs.Stats

    try {
      stat = await lstat(dir)
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
      throw new CLIError(`Input directory "${dir}" is not found.`)
    }

    if (!stat.isDirectory()) throw new CLIError(`"${dir}" is not directory.`)

    return dir
  }

  private async loadConf(confPath?: string) {
    const explorer = cosmiconfig(MarpCLIConfig.moduleName)

    try {
      const ret = await (confPath === undefined
        ? explorer.search()
        : explorer.load(confPath))

      if (ret) {
        this.confPath = ret.filepath
        this.conf = ret.config
      }
    } catch (e) {
      throw new CLIError(
        [
          'Could not find or parse configuration file.',
          e.name !== 'Error' && `(${e.name})`,
          confPath !== undefined && `[${confPath}]`,
        ]
          .filter(m => m)
          .join(' ')
      )
    }
  }

  private async loadTheme(): Promise<string | Theme | undefined> {
    const theme = (() => {
      if (this.args.theme)
        return {
          advice: { use: '--theme-set', insteadOf: '--theme' },
          name: this.args.theme,
          path: path.resolve(this.args.theme),
        }

      if (this.conf.theme)
        return {
          advice: { use: 'themeSet', insteadOf: 'theme' },
          name: this.conf.theme,
          path: path.resolve(path.dirname(this.confPath!), this.conf.theme),
        }
    })()
    if (!theme) return undefined

    try {
      return await Theme.initialize(theme.path, { overrideName: true })
    } catch (e) {
      if (e.code === 'EISDIR') {
        info(
          `Please use ${chalk.yellow(theme.advice.use)} option instead of ${
            theme.advice.insteadOf
          } to make theme CSS available from directory.`
        )
        throw new CLIError(
          `Directory cannot pass to theme option. (${theme.path})`
        )
      }

      if (e.code !== 'ENOENT') throw e
    }

    return theme.name
  }

  private pickDefined<T>(...args: T[]): T | undefined {
    return args.find(v => v !== undefined)
  }
}

export default MarpCLIConfig.fromArguments

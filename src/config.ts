import { Marp } from '@marp-team/marp-core'
import chalk from 'chalk'
import cosmiconfig from 'cosmiconfig'
import path from 'path'
import fs from 'fs'
import osLocale from 'os-locale'
import { promisify } from 'util'
import { info, warn } from './cli'
import { ConverterOption, ConvertType } from './converter'
import resolveEngine, { ResolvableEngine, ResolvedEngine } from './engine'
import { CLIError } from './error'
import { Theme, ThemeSet } from './theme'
import { TemplateOption } from './templates'

const lstat = promisify(fs.lstat)

type Overwrite<T, U> = Omit<T, Extract<keyof T, keyof U>> & U

export type IMarpCLIArguments = IMarpCLIBaseArguments & IMarpCLIBespokeArguments

interface IMarpCLIBaseArguments {
  _?: string[]
  allowLocalFiles?: boolean
  configFile?: string
  description?: string
  engine?: string
  html?: boolean
  image?: string
  inputDir?: string
  jpegQuality?: number
  ogImage?: string
  output?: string | false
  pdf?: boolean
  preview?: boolean
  server?: boolean
  template?: string
  theme?: string
  themeSet?: string[]
  title?: string
  url?: string
  watch?: boolean
}

interface IMarpCLIBespokeArguments {
  bespokeOsc?: boolean
  bespokeProgress?: boolean
}

export type IMarpCLIConfig = Overwrite<
  Omit<IMarpCLIBaseArguments, 'configFile' | '_'>,
  {
    bespoke?: {
      osc?: boolean
      progress?: boolean
    }
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
  engine!: ResolvedEngine

  static moduleName = 'marp'

  static async fromArguments(args: IMarpCLIArguments) {
    const conf = new MarpCLIConfig()
    conf.args = args

    await conf.loadConf(args.configFile)

    conf.engine = await (() => {
      if (conf.args.engine) return resolveEngine(conf.args.engine)
      if (conf.conf.engine)
        return resolveEngine(conf.conf.engine, conf.confPath)

      return resolveEngine(['@marp-team/marp-core', Marp])
    })()

    return conf
  }

  private constructor() {}

  async converterOption(): Promise<ConverterOption> {
    const inputDir = await this.inputDir()
    const server = this.pickDefined(this.args.server, this.conf.server) || false
    const output = (() => {
      if (server) return false
      if (this.args.output !== undefined) return this.args.output
      if (this.conf.output !== undefined)
        return this.conf.output === '-' || this.conf.output === false
          ? this.conf.output
          : path.resolve(path.dirname(this.confPath!), this.conf.output)

      return undefined
    })()

    const template = this.args.template || this.conf.template || 'bespoke'
    const templateOption: TemplateOption = (() => {
      if (template === 'bespoke') {
        const bespoke = this.conf.bespoke || {}

        return {
          osc: this.pickDefined(this.args.bespokeOsc, bespoke.osc),
          progress: this.pickDefined(
            this.args.bespokeProgress,
            bespoke.progress
          ),
        }
      }
      return {}
    })()

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

    const type = ((): ConvertType => {
      // CLI options
      if (this.args.pdf || this.conf.pdf) return ConvertType.pdf

      const image = this.args.image || this.conf.image
      if (image === 'png') return ConvertType.png
      if (image === 'jpeg') return ConvertType.jpeg

      // Detect from filename
      const lowerOutput = (output || '').toLowerCase()
      if (lowerOutput.endsWith('.pdf')) return ConvertType.pdf
      if (lowerOutput.endsWith('.png')) return ConvertType.png
      if (lowerOutput.endsWith('.jpg') || lowerOutput.endsWith('.jpeg'))
        return ConvertType.jpeg

      return ConvertType.html
    })()

    const preview = (() => {
      const p = this.pickDefined(this.args.preview, this.conf.preview) || false

      if (p && process.env.IS_DOCKER) {
        warn(
          `Preview window cannot show in an official docker image. Preview option was ignored.`
        )
        return false
      }

      return p
    })()

    return {
      inputDir,
      output,
      preview,
      server,
      template,
      templateOption,
      themeSet,
      type,
      allowLocalFiles:
        this.pickDefined(
          this.args.allowLocalFiles,
          this.conf.allowLocalFiles
        ) || false,
      engine: this.engine.klass,
      globalDirectives: {
        description: this.pickDefined(
          this.args.description,
          this.conf.description
        ),
        image: this.pickDefined(this.args.ogImage, this.conf.ogImage),
        theme: theme instanceof Theme ? theme.name : theme,
        title: this.pickDefined(this.args.title, this.conf.title),
        url: this.pickDefined(this.args.url, this.conf.url),
      },
      html: this.pickDefined(this.args.html, this.conf.html),
      jpegQuality:
        this.pickDefined(this.args.jpegQuality, this.conf.jpegQuality) || 85,
      lang: this.conf.lang || (await osLocale()).replace(/[_@]/g, '-'),
      options: this.conf.options || {},
      readyScript: this.engine.browserScript
        ? `<script>${this.engine.browserScript}</script>`
        : undefined,
      watch:
        this.pickDefined(this.args.watch, this.conf.watch) ||
        preview ||
        server ||
        false,
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

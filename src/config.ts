/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Marp } from '@marp-team/marp-core'
import chalk from 'chalk'
import { cosmiconfig } from 'cosmiconfig'
import osLocale from 'os-locale'
import { info, warn } from './cli'
import { ConverterOption, ConvertType } from './converter'
import resolveEngine, { ResolvableEngine, ResolvedEngine } from './engine'
import { error } from './error'
import { TemplateOption } from './templates'
import { Theme, ThemeSet } from './theme'

const lstat = promisify(fs.lstat)

type Overwrite<T, U> = Omit<T, Extract<keyof T, keyof U>> & U

interface IMarpCLIArguments {
  _?: string[]
  allowLocalFiles?: boolean
  bespoke?: {
    osc?: boolean
    progress?: boolean
  }
  configFile?: string
  description?: string
  engine?: string
  html?: boolean
  image?: string
  images?: string
  inputDir?: string
  jpegQuality?: number
  ogImage?: string
  output?: string | false
  pdf?: boolean
  pptx?: boolean
  preview?: boolean
  server?: boolean
  template?: string
  theme?: string
  themeSet?: string[]
  title?: string
  url?: string
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

  private constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async converterOption(): Promise<ConverterOption> {
    const inputDir = await this.inputDir()
    const server = this.args.server ?? this.conf.server ?? false
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
          osc: this.args.bespoke?.osc ?? bespoke.osc,
          progress: this.args.bespoke?.progress ?? bespoke.progress,
        }
      }
      return {}
    })()

    const theme = await this.loadTheme()
    const initialThemes = theme instanceof Theme ? [theme] : []

    const themeSetPaths =
      this.args.themeSet ||
      (this.conf.themeSet
        ? (Array.isArray(this.conf.themeSet)
            ? this.conf.themeSet
            : [this.conf.themeSet]
          ).map((f) => path.resolve(path.dirname(this.confPath!), f))
        : [])

    const themeSet = await ThemeSet.initialize(
      (inputDir ? [inputDir] : []).concat(themeSetPaths),
      initialThemes
    )

    if (
      themeSet.themes.size <= initialThemes.length &&
      themeSetPaths.length > 0
    )
      warn('Not found additional theme CSS files.')

    const type = ((): ConvertType => {
      // CLI options
      if (this.args.pdf || this.conf.pdf) return ConvertType.pdf
      if (this.args.pptx || this.conf.pptx) return ConvertType.pptx

      const image =
        this.args.images ||
        this.conf.images ||
        this.args.image ||
        this.conf.image

      if (image === 'png') return ConvertType.png
      if (image === 'jpeg') return ConvertType.jpeg

      // Detect from filename
      const lowerOutput = (output || '').toLowerCase()
      if (lowerOutput.endsWith('.pdf')) return ConvertType.pdf
      if (lowerOutput.endsWith('.png')) return ConvertType.png
      if (lowerOutput.endsWith('.pptx')) return ConvertType.pptx
      if (lowerOutput.endsWith('.jpg') || lowerOutput.endsWith('.jpeg'))
        return ConvertType.jpeg

      return ConvertType.html
    })()

    const preview = (() => {
      const p = this.args.preview ?? this.conf.preview ?? false

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
        this.args.allowLocalFiles ?? this.conf.allowLocalFiles ?? false,
      engine: this.engine.klass,
      globalDirectives: {
        description: this.args.description ?? this.conf.description,
        image: this.args.ogImage ?? this.conf.ogImage,
        theme: theme instanceof Theme ? theme.name : theme,
        title: this.args.title ?? this.conf.title,
        url: this.args.url ?? this.conf.url,
      },
      html: this.args.html ?? this.conf.html,
      jpegQuality: this.args.jpegQuality ?? this.conf.jpegQuality ?? 85,
      lang: this.conf.lang || (await osLocale()).replace(/@/g, '-'),
      options: this.conf.options || {},
      pages: !!(this.args.images || this.conf.images),
      watch: (this.args.watch ?? this.conf.watch) || preview || server || false,
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
          if (this.args._.length > 1) {
            error('Server mode have to specify just one directory.')
          }
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
      error(`Input directory "${dir}" is not found.`)
    }

    if (!stat.isDirectory()) error(`"${dir}" is not directory.`)

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
      error(
        [
          'Could not find or parse configuration file.',
          e.name !== 'Error' && `(${e.name})`,
          confPath !== undefined && `[${confPath}]`,
        ]
          .filter((m) => m)
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
        error(`Directory cannot pass to theme option. (${theme.path})`)
      }

      if (e.code !== 'ENOENT') throw e
    }

    return theme.name
  }
}

export default MarpCLIConfig.fromArguments

import { Marp, MarpOptions } from '@marp-team/marp-core'
import { MarpitOptions } from '@marp-team/marpit'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'
import puppeteer, { PDFOptions } from 'puppeteer-core'
import { warn } from './cli'
import { Engine } from './engine'
import { error } from './error'
import { File, FileType } from './file'
import templates, { TemplateResult } from './templates/'
import { ThemeSet } from './theme'
import { notifier } from './watcher'

export enum ConvertType {
  html = 'html',
  pdf = 'pdf',
}

export interface ConverterOption {
  allowLocalFiles: boolean
  engine: Engine
  html?: MarpOptions['html']
  inputDir?: string
  lang: string
  options: MarpitOptions
  output?: string
  readyScript?: string
  template: string
  theme?: string
  themeSet: ThemeSet
  type: ConvertType
  watch: boolean
}

export interface ConvertResult {
  file: File
  newFile: File
  template: TemplateResult
}

export type ConvertedCallback = (result: ConvertResult) => void

export class Converter {
  readonly options: ConverterOption

  constructor(opts: ConverterOption) {
    this.options = opts
  }

  get template() {
    const template = templates[this.options.template]
    if (!template) error(`Template "${this.options.template}" is not found.`)

    return template
  }

  async convert(markdown: string, file?: File): Promise<TemplateResult> {
    const { lang, readyScript, theme, type } = this.options

    const isFile = file && file.type === FileType.File
    const additionals = theme
      ? `\n<!-- theme: ${JSON.stringify(theme)} -->`
      : ''

    return await this.template({
      lang,
      readyScript,
      base: isFile && type === ConvertType.pdf ? file!.absolutePath : undefined,
      notifyWS:
        isFile && this.options.watch && type === ConvertType.html
          ? await notifier.register(file!.absolutePath)
          : undefined,
      renderer: tplOpts => {
        const engine = this.generateEngine(tplOpts)
        const ret = engine.render(`${markdown}${additionals}`)

        if (isFile) {
          const themeDir: string | undefined =
            ((<any>engine).lastGlobalDirectives || {}).theme ||
            (engine.themeSet.default! || {}).name

          this.options.themeSet.observe(file!.absolutePath, themeDir)
        }

        return ret
      },
    })
  }

  async convertFile(file: File): Promise<ConvertResult> {
    const buffer = await file.load()
    const template = await this.convert(buffer.toString(), file)
    const newFile = file.convert(this.options.output, this.options.type)

    newFile.buffer = new Buffer(template.result)

    if (this.options.type === ConvertType.pdf)
      await this.convertFileToPDF(newFile)

    await newFile.save()
    return { file, newFile, template }
  }

  async convertFiles(
    files: File[],
    onConverted: ConvertedCallback = () => {}
  ): Promise<void> {
    const { inputDir, output } = this.options

    if (!inputDir && output && output !== '-' && files.length > 1)
      error('Output path cannot specify with processing multiple files.')

    for (const file of files) onConverted(await this.convertFile(file))
  }

  private async convertFileToPDF(file: File) {
    const tmpFile: File.TmpFileInterface | undefined = await (() => {
      if (!this.options.allowLocalFiles) return undefined

      const warning = `Insecure local file accessing is enabled for conversion of ${file.relativePath()}.`
      warn(warning)

      return file.saveTmpFile('.html')
    })()

    const uri = tmpFile
      ? `file://${tmpFile.path}`
      : `data:text/html,${file.buffer!.toString()}`

    try {
      const browser = await Converter.runBrowser()
      const page = await browser.newPage()

      try {
        await page.goto(uri, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
        })

        file.buffer = await page.pdf(<PDFOptions>{
          printBackground: true,
          preferCSSPageSize: true,
        })
      } finally {
        await page.close()
      }
    } finally {
      if (tmpFile) await tmpFile.cleanup()
    }
  }

  static async closeBrowser() {
    if (Converter.browser) await Converter.browser.close()
  }

  private static browser?: puppeteer.Browser

  private generateEngine(mergeOptions: MarpitOptions) {
    const { html, options } = this.options
    const opts: any = { ...options, ...mergeOptions }

    // for marp-core
    if (html !== undefined) opts.html = html

    const engine = new this.options.engine(opts)

    if (typeof engine.render !== 'function')
      error('Specified engine has not implemented render() method.')

    // for Marpit engine
    if (!(engine instanceof Marp)) engine.markdown.set({ html: !!html })

    // Additional themes
    this.options.themeSet.registerTo(engine)

    return engine
  }

  private static async runBrowser() {
    if (!Converter.browser) {
      const args: string[] = []
      const finder: () => string[] = require('is-wsl')
        ? chromeFinder.wsl
        : chromeFinder[process.platform]

      if (process.env.IS_DOCKER)
        args.push('--no-sandbox', '--disable-dev-shm-usage')

      Converter.browser = await puppeteer.launch({
        args,
        executablePath: finder ? finder()[0] : undefined,
      })

      Converter.browser.once('disconnected', () => {
        Converter.browser = undefined
      })
    }
    return Converter.browser
  }
}

import { Marp, MarpOptions } from '@marp-team/marp-core'
import { MarpitOptions } from '@marp-team/marpit'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'
import puppeteer, { PDFOptions } from 'puppeteer-core'
import { warn } from './cli'
import { Engine } from './engine'
import { error } from './error'
import { File, FileType } from './file'
import templates, { TemplateResult } from './templates/'

export enum ConvertType {
  html = 'html',
  pdf = 'pdf',
}

export interface ConverterOption {
  allowLocalFiles: boolean
  engine: Engine
  html?: MarpOptions['html']
  lang: string
  options: MarpitOptions
  output?: string
  readyScript?: string
  template: string
  theme?: string
  type: ConvertType
}

export interface ConvertResult {
  file: File
  newFile: File
  template: TemplateResult
}

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

    let additionals = ''
    let base

    if (theme) additionals += `\n<!-- theme: ${JSON.stringify(theme)} -->`

    if (type === ConvertType.pdf && file && file.type === FileType.File)
      base = file.absolutePath

    return await this.template({
      base,
      lang,
      readyScript,
      renderer: tplOpts =>
        this.generateEngine(tplOpts).render(`${markdown}${additionals}`),
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
    onConverted: (result: ConvertResult) => void = () => {}
  ): Promise<void> {
    if (this.options.output && this.options.output !== '-' && files.length > 1)
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

      try {
        const page = await browser.newPage()
        await page.goto(uri, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
        })

        file.buffer = await page.pdf(<PDFOptions>{
          printBackground: true,
          preferCSSPageSize: true,
        })
      } finally {
        await browser.close()
      }
    } finally {
      if (tmpFile) await tmpFile.cleanup()
    }
  }

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

    return engine
  }

  private static runBrowser() {
    const args: string[] = []
    const finder: () => string[] = require('is-wsl')
      ? chromeFinder.wsl
      : chromeFinder[process.platform]

    if (process.env.IS_DOCKER)
      args.push('--no-sandbox', '--disable-dev-shm-usage')

    return puppeteer.launch({
      args,
      executablePath: finder ? finder()[0] : undefined,
    })
  }
}

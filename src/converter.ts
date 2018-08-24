import { Marpit, MarpitOptions } from '@marp-team/marpit'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'
import puppeteer, { PDFOptions } from 'puppeteer-core'
import { error } from './error'
import { File } from './file'
import templates, { TemplateResult } from './templates'

export enum ConvertType {
  html = 'html',
  pdf = 'pdf',
}

export interface ConverterOption {
  engine: typeof Marpit
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

  convert(markdown: string): TemplateResult {
    let additionals = ''

    if (this.options.theme)
      additionals += `\n<!-- theme: ${JSON.stringify(this.options.theme)} -->`

    return this.template({
      lang: this.options.lang,
      readyScript: this.options.readyScript,
      renderer: tplOpts =>
        this.generateEngine(tplOpts).render(`${markdown}${additionals}`),
    })
  }

  async convertFile(file: File): Promise<ConvertResult> {
    const buffer = await file.load()
    const template = this.convert(buffer.toString())
    const newFile = file.convert(this.options.output, this.options.type)

    newFile.buffer = await (async () => {
      if (this.options.type === ConvertType.pdf) {
        const browser = await Converter.runBrowser()

        try {
          const page = await browser.newPage()
          await page.goto(`data:text/html,${template.result}`, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
          })

          return await page.pdf(<PDFOptions>{
            printBackground: true,
            preferCSSPageSize: true,
          })
        } finally {
          await browser.close()
        }
      }
      return new Buffer(template.result)
    })()

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

  private generateEngine(mergeOptions: MarpitOptions) {
    const engine = new this.options.engine({
      ...this.options.options,
      ...mergeOptions,
    })

    if (typeof engine.render !== 'function')
      error('Specified engine has not implemented render() method.')

    return engine
  }

  private static runBrowser() {
    const finder: () => string[] = require('is-wsl')
      ? chromeFinder.wsl
      : chromeFinder[process.platform]

    return puppeteer.launch({
      executablePath: finder ? finder()[0] : undefined,
    })
  }
}

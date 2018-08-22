import { Marpit, MarpitRenderResult, MarpitOptions } from '@marp-team/marpit'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'
import fs from 'fs'
import path from 'path'
import puppeteer, { PDFOptions } from 'puppeteer-core'
import { error } from './error'
import templates from './templates'

export enum ConvertType {
  html = 'html',
  pdf = 'pdf',
}

export interface ConverterOption {
  engine: typeof Marpit
  options: MarpitOptions
  output?: string
  readyScript?: string
  template: string
  theme?: string
  type: ConvertType
}

export interface ConvertResult {
  output: string
  path: string
  rendered: MarpitRenderResult
  result: Buffer | string
}

export class Converter {
  readonly options: ConverterOption

  constructor(opts: ConverterOption) {
    this.options = opts

    if (opts.type === ConvertType.pdf && opts.output === '-')
      error('PDF cannot export to stdout.')
  }

  get template() {
    const template = templates[this.options.template]
    if (!template) error(`Template "${this.options.template}" is not found.`)

    return template
  }

  convert(markdown: string) {
    let additionals = ''

    if (this.options.theme)
      additionals += `\n<!-- theme: ${JSON.stringify(this.options.theme)} -->`

    return this.template({
      readyScript: this.options.readyScript,
      renderer: tplOpts =>
        this.generateEngine(tplOpts).render(`${markdown}${additionals}`),
    })
  }

  async convertFile(path: string): Promise<ConvertResult> {
    const buffer = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(path, (e, data) => (e ? reject(e) : resolve(data)))
    )

    const converted = this.convert(buffer.toString())
    const output = this.outputPath(path, this.options.type)

    let result: any = converted.result

    if (this.options.type === ConvertType.pdf) {
      const browser = await Converter.runBrowser()

      try {
        const page = await browser.newPage()
        await page.goto(`data:text/html,${result}`, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
        })

        result = await page.pdf(<PDFOptions>{
          path: output,
          printBackground: true,
          preferCSSPageSize: true,
        })
      } finally {
        await browser.close()
      }
    } else if (output !== '-') {
      await new Promise<void>((resolve, reject) =>
        fs.writeFile(output, result, e => (e ? reject(e) : resolve()))
      )
    }

    return { output, path, result, rendered: converted.rendered }
  }

  async convertFiles(
    files: string[],
    onConverted: (result: ConvertResult) => void = () => {}
  ) {
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

  private outputPath(from: string, extension: string): string {
    if (this.options.output) return this.options.output

    return path.join(
      path.dirname(from),
      `${path.basename(from, path.extname(from))}.${extension}`
    )
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

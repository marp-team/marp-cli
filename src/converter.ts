import { MarpOptions } from '@marp-team/marp-core'
import { Marpit, MarpitOptions } from '@marp-team/marpit'
import chalk from 'chalk'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'
import puppeteer from 'puppeteer-core'
import { URL } from 'url'
import { silence, warn } from './cli'
import { Engine } from './engine'
import metaPlugin from './engine/meta-plugin'
import infoPlugin, { engineInfo, EngineInfo } from './engine/info-plugin'
import { error } from './error'
import { File, FileType } from './file'
import templates, {
  Template,
  TemplateMeta,
  TemplateOption,
  TemplateResult,
} from './templates/'
import { ThemeSet } from './theme'
import { notifier } from './watcher'

export enum ConvertType {
  html = 'html',
  pdf = 'pdf',
  png = 'png',
  pptx = 'pptx',
  jpeg = 'jpg',
}

export const mimeTypes = {
  [ConvertType.html]: 'text/html',
  [ConvertType.pdf]: 'application/pdf',
  [ConvertType.png]: 'image/png',
  [ConvertType.pptx]:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  [ConvertType.jpeg]: 'image/jpeg',
}

export interface ConverterOption {
  allowLocalFiles: boolean
  engine: Engine
  globalDirectives: { theme?: string } & Partial<TemplateMeta>
  html?: MarpOptions['html']
  inputDir?: string
  lang: string
  options: MarpitOptions
  output?: string | false
  pages?: boolean | number[]
  preview?: boolean
  jpegQuality?: number
  readyScript?: string
  server?: boolean
  template: string
  templateOption?: TemplateOption
  themeSet: ThemeSet
  type: ConvertType
  watch: boolean
}

export interface ConvertFileOption {
  onConverted?: ConvertedCallback
  onlyScanning?: boolean
}

export interface ConvertImageOption {
  pages?: boolean | number[]
  quality?: number
  type: ConvertType.png | ConvertType.jpeg
}

export interface ConvertResult {
  file: File
  newFile?: File
  template: TemplateResult
}

export type ConvertedCallback = (result: ConvertResult) => void

export class Converter {
  readonly options: ConverterOption

  constructor(opts: ConverterOption) {
    this.options = opts
  }

  get template(): Template {
    const template = templates[this.options.template]
    if (!template) error(`Template "${this.options.template}" is not found.`)

    return template
  }

  async convert(markdown: string, file?: File): Promise<TemplateResult> {
    const { lang, readyScript, globalDirectives, type } = this.options
    const isFile = file && file.type === FileType.File

    let additionals = ''

    for (const directive of Object.keys(globalDirectives)) {
      if (globalDirectives[directive] !== undefined) {
        additionals += `\n<!-- ${directive}: ${JSON.stringify(
          globalDirectives[directive]
        )} -->`
      }
    }

    return await this.template({
      ...(this.options.templateOption || {}),
      lang,
      readyScript,
      base:
        isFile && type !== ConvertType.html
          ? file!.absoluteFileScheme
          : undefined,
      notifyWS:
        isFile && this.options.watch && type === ConvertType.html
          ? await notifier.register(file!.absolutePath)
          : undefined,
      renderer: tplOpts => {
        const engine = this.generateEngine(tplOpts)
        const ret = engine.render(`${markdown}${additionals}`)
        const info = engine[engineInfo]

        if (isFile)
          this.options.themeSet.observe(file!.absolutePath, info && info.theme)

        return { ...ret, ...info! }
      },
    })
  }

  async convertFile(
    file: File,
    opts: ConvertFileOption = {}
  ): Promise<ConvertResult> {
    const template = await (async (): Promise<TemplateResult> => {
      try {
        silence(!!opts.onlyScanning)
        return await this.convert((await file.load()).toString(), file)
      } finally {
        silence(false)
      }
    })()

    if (!opts.onlyScanning) {
      const files: File[] = []

      switch (this.options.type) {
        case ConvertType.pdf:
          files.push(await this.convertFileToPDF(template, file))
          break
        case ConvertType.png:
        case ConvertType.jpeg:
          files.push(
            ...(await this.convertFileToImage(template, file, {
              pages: this.options.pages,
              quality: this.options.jpegQuality,
              type: this.options.type,
            }))
          )
          break
        case ConvertType.pptx:
          files.push(await this.convertFileToPPTX(template, file))
          break
        default:
          files.push(this.convertFileToHTML(template, file))
      }

      for (const newFile of files) {
        await newFile.save()
        if (opts.onConverted) opts.onConverted({ file, newFile, template })
      }

      // #convertFile must return a single file to serve in server
      return { file, template, newFile: files[0] }
    }

    return { file, template }
  }

  async convertFiles(files: File[], opts: ConvertFileOption = {}) {
    const { inputDir, output } = this.options

    if (!inputDir && output && output !== '-' && files.length > 1)
      error('Output path cannot specify with processing multiple files.')

    for (const file of files) await this.convertFile(file, opts)
  }

  private convertFileToHTML(tpl: TemplateResult, file: File): File {
    const ret = file.convert(this.options.output, { extension: 'html' })
    ret.buffer = Buffer.from(tpl.result)

    return ret
  }

  private async convertFileToPDF(
    tpl: TemplateResult,
    file: File
  ): Promise<File> {
    const html = new File(file.absolutePath)
    html.buffer = Buffer.from(tpl.result)

    const ret = file.convert(this.options.output, { extension: 'pdf' })

    ret.buffer = await this.usePuppeteer(html, async (page, uri) => {
      await page.goto(uri, { waitUntil: ['domcontentloaded', 'networkidle0'] })
      return await page.pdf({ printBackground: true, preferCSSPageSize: true })
    })

    return ret
  }

  private async convertFileToImage(
    tpl: TemplateResult,
    file: File,
    opts: ConvertImageOption
  ): Promise<File[]> {
    const html = new File(file.absolutePath)
    html.buffer = Buffer.from(tpl.result)

    const files: File[] = []

    await this.usePuppeteer(html, async (page, uri) => {
      await page.setViewport(tpl.rendered.size)
      await page.goto(uri, { waitUntil: ['domcontentloaded', 'networkidle0'] })
      await page.emulateMedia('print')

      const screenshot = async (pageNumber?: number) => {
        await page.evaluate(
          `window.scrollTo(0,${((pageNumber || 1) - 1) *
            tpl.rendered.size.height})`
        )

        if (opts.type === ConvertType.jpeg)
          return await page.screenshot({ quality: opts.quality, type: 'jpeg' })

        return await page.screenshot({ type: 'png' })
      }

      if (opts.pages) {
        // Multiple images
        for (let page = 1; page <= tpl.rendered.length; page += 1) {
          const ret = file.convert(this.options.output, {
            page,
            extension: opts.type,
          })
          ret.buffer = await screenshot(page)

          files.push(ret)
        }
      } else {
        // Title image
        const ret = file.convert(this.options.output, { extension: opts.type })
        ret.buffer = await screenshot()

        files.push(ret)
      }
    })

    return files
  }

  private async convertFileToPPTX(tpl: TemplateResult, file: File) {
    const imageFiles = await this.convertFileToImage(tpl, file, {
      pages: true,
      type: ConvertType.png,
    })

    const pptx = new (await import('@marp-team/pptx')).default()
    const layoutName = `${tpl.rendered.size.width}x${tpl.rendered.size.height}`

    pptx.setAuthor('Created by Marp')
    pptx.setCompany('Created by Marp')
    pptx.setLayout({
      name: layoutName,
      width: tpl.rendered.size.width / 96,
      height: tpl.rendered.size.height / 96,
    })

    if (tpl.rendered.title) pptx.setTitle(tpl.rendered.title)
    if (tpl.rendered.description) pptx.setSubject(tpl.rendered.description)

    let page = 0

    for (const imageFile of imageFiles) {
      page += 1

      pptx.defineSlideMaster({
        title: `Page ${page}`,
        bkgd: {
          data: `data:image/png;base64,${imageFile.buffer!.toString('base64')}`,
        },
        margin: 0,
      })

      const slide = pptx.addNewSlide(`Page ${page}`)
      const notes = tpl.rendered.comments[page - 1].join('\n\n')

      if (notes) slide.addNotes(notes)
    }

    const ret = file.convert(this.options.output, { extension: 'pptx' })
    ret.buffer = await new Promise(res => pptx.save('jszip', res, 'nodebuffer'))

    return ret
  }

  private generateEngine(
    mergeOptions: MarpitOptions
  ): Marpit & { [engineInfo]: EngineInfo | undefined } {
    const { html, options } = this.options
    const { prototype } = this.options.engine
    const opts = { ...options, ...mergeOptions, html }

    const engine =
      prototype && prototype.hasOwnProperty('constructor')
        ? new this.options.engine(opts)
        : (<any>this.options.engine)(opts)

    if (typeof engine.render !== 'function')
      error('Specified engine has not implemented render() method.')

    if (html !== undefined) engine.markdown.set({ html })

    // Marpit plugins
    engine.use(metaPlugin).use(infoPlugin)

    // Additional themes
    this.options.themeSet.registerTo(engine)

    return engine
  }

  private async usePuppeteer<T>(
    baseFile: File,
    process: (page: puppeteer.Page, uri: string) => Promise<T>
  ) {
    const tmpFile: File.TmpFileInterface | undefined = await (() => {
      if (!this.options.allowLocalFiles) return undefined

      warn(
        `Insecure local file accessing is enabled for conversion from ${baseFile.relativePath()}.`
      )
      return baseFile.saveTmpFile('.html')
    })()

    const uri = tmpFile
      ? `file://${tmpFile.path}`
      : `data:text/html;base64,${baseFile.buffer!.toString('base64')}`

    try {
      const browser = await Converter.runBrowser()
      const page = await browser.newPage()
      const tracker = this.trackFailedLocalFileAccess(page)

      try {
        return await process(page, uri)
      } finally {
        if (tracker.size > 0) {
          warn(
            `Marp CLI has detected accessing to local file${
              tracker.size > 1 ? 's' : ''
            }. ${
              tracker.size > 1 ? 'They are' : 'That is'
            } blocked by security reason. Instead we recommend using assets uploaded to online. (Or you can use ${chalk.yellow(
              '--allow-local-files'
            )} option if you are understood of security risk)`
          )
        }
        await page.close()
      }
    } finally {
      if (tmpFile) await tmpFile.cleanup()
    }
  }

  private trackFailedLocalFileAccess(page: puppeteer.Page): Set<string> {
    const failedFileSet = new Set<string>()

    page.on('requestfailed', (req: puppeteer.Request) => {
      try {
        const url = new URL(req.url())
        if (url.protocol === 'file:') failedFileSet.add(url.href)
      } catch (e) {}
    })

    return failedFileSet
  }

  static async closeBrowser() {
    if (Converter.browser) await Converter.browser.close()
  }

  private static browser?: puppeteer.Browser

  private static async runBrowser() {
    if (!Converter.browser) {
      const args: string[] = []
      if (process.env.IS_DOCKER) args.push('--no-sandbox')

      // Workaround for Chrome 73 in docker and unit testing with CircleCI
      // https://github.com/GoogleChrome/puppeteer/issues/3774
      if (process.env.IS_DOCKER || process.env.CI)
        args.push('--disable-features=VizDisplayCompositor')

      const finder: () => string[] = (() => {
        if (process.env.IS_DOCKER) return () => ['/usr/bin/chromium-browser']
        if (require('is-wsl')) return chromeFinder.wsl
        return chromeFinder[process.platform]
      })()

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

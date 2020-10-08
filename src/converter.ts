/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { URL } from 'url'
import { MarpOptions } from '@marp-team/marp-core'
import { Marpit, Options as MarpitOptions } from '@marp-team/marpit'
import chalk from 'chalk'
import puppeteer from 'puppeteer-core'
import { silence, warn } from './cli'
import { Engine } from './engine'
import infoPlugin, { engineInfo, EngineInfo } from './engine/info-plugin'
import metaPlugin from './engine/meta-plugin'
import { error } from './error'
import { File, FileType } from './file'
import templates, {
  Template,
  TemplateMeta,
  TemplateOption,
  TemplateResult,
} from './templates/'
import { ThemeSet } from './theme'
import {
  generatePuppeteerDataDirPath,
  generatePuppeteerLaunchArgs,
} from './utils/puppeteer'
import { isWSL, resolveWSLPath } from './utils/wsl'
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
    const { lang, globalDirectives, type } = this.options
    const isFile = (f: File | undefined): f is File =>
      !!f && f.type === FileType.File

    const resolveBase = async (f: File) =>
      isWSL()
        ? `file:${await resolveWSLPath(f.absolutePath)}`
        : f.absoluteFileScheme

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
      base:
        isFile(file) && type !== ConvertType.html
          ? await resolveBase(file)
          : undefined,
      notifyWS:
        isFile(file) && this.options.watch && type === ConvertType.html
          ? await notifier.register(file.absolutePath)
          : undefined,
      renderer: (tplOpts) => {
        const engine = this.generateEngine(tplOpts)
        const ret = engine.render(`${markdown}${additionals}`)
        const info = engine[engineInfo]

        if (isFile(file))
          this.options.themeSet.observe(file.absolutePath, info?.theme)

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
      await page.emulateMediaType('print')

      const screenshot = async (pageNumber?: number) => {
        await page.evaluate(
          `window.scrollTo(0,${
            ((pageNumber || 1) - 1) * tpl.rendered.size.height
          })`
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

    const pptx = new (await import('pptxgenjs')).default()
    const layoutName = `${tpl.rendered.size.width}x${tpl.rendered.size.height}`

    pptx.author = 'Created by Marp'
    pptx.company = 'Created by Marp'

    pptx.defineLayout({
      name: layoutName,
      width: tpl.rendered.size.width / 96,
      height: tpl.rendered.size.height / 96,
    })
    pptx.layout = layoutName

    if (tpl.rendered.title) pptx.title = tpl.rendered.title
    if (tpl.rendered.description) pptx.subject = tpl.rendered.description

    imageFiles.forEach((imageFile, page) => {
      const slide = pptx.addSlide()
      slide.background = {
        data: `data:image/png;base64,${imageFile.buffer!.toString('base64')}`,
      }

      const notes = tpl.rendered.comments[page].join('\n\n')
      if (notes) slide.addNotes(notes)
    })

    const ret = file.convert(this.options.output, { extension: 'pptx' })
    ret.buffer = (await pptx.write('nodebuffer')) as Buffer

    return ret
  }

  private generateEngine(
    mergeOptions: MarpitOptions
  ): Marpit & { [engineInfo]: EngineInfo | undefined } {
    const { html, options } = this.options
    const { prototype } = this.options.engine
    const opts = { ...options, ...mergeOptions, html }

    const engine =
      prototype &&
      Object.prototype.hasOwnProperty.call(prototype, 'constructor')
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
    processer: (page: puppeteer.Page, uri: string) => Promise<T>
  ) {
    const tmpFile: File.TmpFileInterface | undefined = await (() => {
      if (!this.options.allowLocalFiles) return undefined

      warn(
        `Insecure local file accessing is enabled for conversion from ${baseFile.relativePath()}.`
      )

      // Snapd Chromium cannot access from sandbox container to user-land `/tmp`
      // directory so create tmp file to home directory if in Linux.
      return baseFile.saveTmpFile({
        home: process.platform === 'linux',
        extension: '.html',
      })
    })()

    const uri = await (async () => {
      if (tmpFile) {
        if (isWSL()) return `file:${await resolveWSLPath(tmpFile.path)}`
        return `file://${tmpFile.path}`
      }
      return `data:text/html;base64,${baseFile.buffer!.toString('base64')}`
    })()

    try {
      const browser = await Converter.runBrowser()
      const page = await browser.newPage()
      const { missingFileSet, failedFileSet } = this.trackFailedLocalFileAccess(
        page
      )

      try {
        return await processer(page, uri)
      } finally {
        if (missingFileSet.size > 0) {
          warn(
            `${missingFileSet.size > 1 ? 'Some of t' : 'T'}he local file${
              missingFileSet.size > 1 ? 's are' : ' is'
            } missing and will be ignored. Make sure the file path${
              missingFileSet.size > 1 ? 's are' : ' is'
            } correct.`
          )
        }
        if (failedFileSet.size > 0) {
          warn(
            `Marp CLI has detected accessing to local file${
              failedFileSet.size > 1 ? 's' : ''
            }. ${
              failedFileSet.size > 1 ? 'They are' : 'That is'
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

  private trackFailedLocalFileAccess(
    page: puppeteer.Page
  ): { missingFileSet: Set<string>; failedFileSet: Set<string> } {
    const missingFileSet = new Set<string>()
    const failedFileSet = new Set<string>()

    page.on('requestfailed', (req: puppeteer.Request) => {
      try {
        const url = new URL(req.url())
        if (url.protocol === 'file:') {
          if (req.failure()?.errorText === 'net::ERR_FILE_NOT_FOUND') {
            missingFileSet.add(url.href)
          } else {
            failedFileSet.add(url.href)
          }
        }
      } catch (e) {
        // No ops
      }
    })

    return { missingFileSet, failedFileSet }
  }

  static async closeBrowser() {
    if (Converter.browser) await Converter.browser.close()
  }

  private static browser?: puppeteer.Browser

  private static async runBrowser() {
    if (!Converter.browser) {
      const baseArgs = generatePuppeteerLaunchArgs()

      Converter.browser = await puppeteer.launch({
        ...baseArgs,
        userDataDir: await generatePuppeteerDataDirPath('marp-cli-conversion', {
          wsl: !!baseArgs.executablePath?.match(/^\/mnt\/[a-z]\//),
        }),
      })
      Converter.browser.once('disconnected', () => {
        Converter.browser = undefined
      })
    }
    return Converter.browser
  }
}

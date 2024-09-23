import { URL } from 'node:url'
import type { Marp, MarpOptions } from '@marp-team/marp-core'
import { Marpit, Options as MarpitOptions } from '@marp-team/marpit'
import chalk from 'chalk'
import type { Page, HTTPRequest, WaitForOptions } from 'puppeteer-core'
import { browserManager } from './browser/manager'
import { silence, warn } from './cli'
import { Engine, ResolvedEngine } from './engine'
import { generateOverrideGlobalDirectivesPlugin } from './engine/directive-plugin'
import infoPlugin, { engineInfo, EngineInfo } from './engine/info-plugin'
import metaPlugin from './engine/meta-plugin'
import {
  generatePDFOutlines,
  pdfOutlineAttr,
  pdfOutlineInfo,
  pdfOutlinePlugin,
  pptrOutlinePositionResolver,
  OutlineData,
} from './engine/pdf/outline-plugin'
import { engineTransition, EngineTransition } from './engine/transition-plugin'
import { error } from './error'
import { File, FileType } from './file'
import templates, {
  bare,
  Template,
  TemplateMeta,
  TemplateOption,
  TemplateResult,
} from './templates/'
import { ThemeSet } from './theme'
import { isOfficialDockerImage } from './utils/container'
import { pdfLib, setOutline } from './utils/pdf'
import { resolveWSLPathToHost } from './utils/wsl'
import { notifier } from './watcher'

const CREATED_BY_MARP = 'Created by Marp'

export enum ConvertType {
  html = 'html',
  pdf = 'pdf',
  png = 'png',
  pptx = 'pptx',
  jpeg = 'jpg',
  notes = 'notes',
}

export const mimeTypes = {
  [ConvertType.html]: 'text/html',
  [ConvertType.pdf]: 'application/pdf',
  [ConvertType.png]: 'image/png',
  [ConvertType.pptx]:
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  [ConvertType.jpeg]: 'image/jpeg',
  [ConvertType.notes]: 'text/plain',
}

export interface ConverterOption {
  allowLocalFiles: boolean
  baseUrl?: string
  engine: Engine
  globalDirectives: { theme?: string } & Partial<TemplateMeta>
  html?: MarpOptions['html']
  imageScale?: number
  inputDir?: string
  lang: string
  options: MarpitOptions
  output?: string | false
  pages?: boolean | number[]
  pdfNotes?: boolean
  pdfOutlines?:
    | false
    | {
        pages: boolean
        headings: boolean
      }
  preview?: boolean
  puppeteerTimeout?: number
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
  scale?: number
  type: ConvertType.png | ConvertType.jpeg
}

export interface ConvertResult {
  file: File
  newFile?: File
  template: TemplateResult
}

export type ConvertedCallback = (result: ConvertResult) => void

const stripBOM = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s)

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

  get puppeteerTimeout(): number {
    return this.options.puppeteerTimeout ?? 30000
  }

  async convert(
    markdown: string,
    file?: File,
    {
      fallbackToPrintableTemplate = false,
    }: { fallbackToPrintableTemplate?: boolean } = {}
  ): Promise<TemplateResult> {
    const { globalDirectives, type } = this.options

    const isFile = (f: File | undefined): f is File =>
      !!f && f.type === FileType.File

    const resolveBase = async (f?: File) => {
      if (this.options.baseUrl) return this.options.baseUrl

      if (isFile(f) && type !== ConvertType.html) {
        const browser = await browserManager.browserForConversion()

        return (await browser.browserInWSLHost())
          ? `file:${await resolveWSLPathToHost(f.absolutePath)}`
          : f.absoluteFileScheme
      }

      return undefined
    }

    let template = this.template
    if (fallbackToPrintableTemplate && !template.printable) template = bare

    return await template({
      ...(this.options.templateOption || {}),
      base: await resolveBase(file),
      notifyWS:
        isFile(file) && this.options.watch && type === ConvertType.html
          ? await notifier.register(file.absolutePath)
          : undefined,
      renderer: async (tplOpts) => {
        const engine = await this.generateEngine(tplOpts)
        engine.use(generateOverrideGlobalDirectivesPlugin(globalDirectives))

        tplOpts.modifier?.(engine)

        const ret = await engine.render(stripBOM(markdown))

        const info = engine[engineInfo]
        const outline = engine[pdfOutlineInfo]
        const transition: EngineTransition | undefined =
          engine[engineTransition]

        if (isFile(file))
          this.options.themeSet.observe(file.absolutePath, info?.theme)

        return { ...ret, ...info!, outline, transition }
      },
    })
  }

  async convertFile(
    file: File,
    opts: ConvertFileOption = {}
  ): Promise<ConvertResult> {
    let template: TemplateResult

    const useTemplate = async (
      fallbackToPrintableTemplate?: boolean
    ): Promise<TemplateResult> => {
      try {
        silence(!!opts.onlyScanning)
        return await this.convert((await file.load()).toString(), file, {
          fallbackToPrintableTemplate,
        })
      } finally {
        silence(false)
      }
    }

    if (!opts.onlyScanning) {
      const files: File[] = []
      switch (this.options.type) {
        case ConvertType.pdf:
          template = await useTemplate(true)
          files.push(await this.convertFileToPDF(template, file))
          break
        case ConvertType.png:
        case ConvertType.jpeg:
          template = await useTemplate(true)
          files.push(
            ...(await this.convertFileToImage(template, file, {
              pages: this.options.pages,
              quality: this.options.jpegQuality,
              scale: this.options.imageScale,
              type: this.options.type,
            }))
          )
          break
        case ConvertType.pptx:
          template = await useTemplate(true)
          files.push(
            await this.convertFileToPPTX(template, file, {
              scale: this.options.imageScale ?? 2,
            })
          )
          break
        case ConvertType.notes:
          template = await useTemplate(false)
          files.push(await this.convertFileToNotes(template, file))
          break
        default:
          template = await useTemplate()
          files.push(this.convertFileToHTML(template, file))
      }

      for (const newFile of files) {
        await newFile.save()
        if (opts.onConverted) opts.onConverted({ file, newFile, template })
      }

      // #convertFile must return a single file to serve in server
      return { file, template, newFile: files[0] }
    } else {
      // Try conversion with specific template to scan using resources
      template = await useTemplate()
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

  private convertFileToNotes(tpl: TemplateResult, file: File): File {
    const ret = file.convert(this.options.output, { extension: 'txt' })
    const comments = tpl.rendered.comments
    if (comments.flat().length === 0) {
      warn(`${file.relativePath()} contains no notes.`)
      ret.buffer = Buffer.from('')
    } else {
      ret.buffer = Buffer.from(
        comments.map((c) => c.join('\n\n')).join('\n\n---\n\n')
      )
    }
    return ret
  }

  private async convertFileToPDF(
    tpl: TemplateResult,
    file: File
  ): Promise<File> {
    const html = new File(file.absolutePath)
    html.buffer = Buffer.from(tpl.result)

    const ret = file.convert(this.options.output, { extension: 'pdf' })

    let outlineData: OutlineData | undefined

    ret.buffer = Buffer.from(
      await this.usePuppeteer(html, async (page, { render }) => {
        await render()

        if (tpl.rendered.outline) {
          outlineData = await page.evaluate(
            pptrOutlinePositionResolver,
            tpl.rendered.outline.flatMap((o) => o.headings),
            pdfOutlineAttr
          )
        }

        return await page.pdf({
          printBackground: true,
          preferCSSPageSize: true,
          timeout: this.puppeteerTimeout,
        })
      })
    )

    // Apply PDF metadata and annotations
    const creationDate = new Date()
    const { PDFDocument, PDFHexString, PDFString } = await pdfLib()
    const pdfDoc = await PDFDocument.load(ret.buffer)

    pdfDoc.setCreator(CREATED_BY_MARP)
    pdfDoc.setProducer(CREATED_BY_MARP)
    pdfDoc.setCreationDate(creationDate)
    pdfDoc.setModificationDate(creationDate)

    if (tpl.rendered.title) pdfDoc.setTitle(tpl.rendered.title)
    if (tpl.rendered.description) pdfDoc.setSubject(tpl.rendered.description)
    if (tpl.rendered.author) pdfDoc.setAuthor(tpl.rendered.author)
    if (tpl.rendered.keywords)
      pdfDoc.setKeywords([tpl.rendered.keywords.join('; ')])

    if (this.options.pdfOutlines && tpl.rendered.outline) {
      await setOutline(
        pdfDoc,
        generatePDFOutlines(tpl.rendered.outline, {
          ...this.options.pdfOutlines,
          data: outlineData,
          size: tpl.rendered.size,
        })
      )
    }

    if (this.options.pdfNotes) {
      const pages = pdfDoc.getPages()

      for (let i = 0, len = pages.length; i < len; i += 1) {
        const notes = tpl.rendered.comments[i].join('\n\n')

        if (notes) {
          const noteAnnot = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Text',
            Rect: [0, 20, 20, 20],
            Contents: PDFHexString.fromText(notes),
            T: tpl.rendered.author
              ? PDFHexString.fromText(tpl.rendered.author)
              : undefined,
            Name: 'Note',
            Subj: PDFString.of('Note'),
            C: [1, 0.92, 0.42], // RGB
            CA: 0.25, // Alpha
          })

          pages[i].node.addAnnot(pdfDoc.context.register(noteAnnot))
        }
      }
    }

    // Apply modified PDF to buffer
    ret.buffer = Buffer.from(await pdfDoc.save())

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

    await this.usePuppeteer(html, async (page, { render }) => {
      await page.setViewport({
        ...tpl.rendered.size,
        deviceScaleFactor: opts.scale ?? 1,
      })
      await render()
      await page.emulateMediaType('print')

      if (opts.type === ConvertType.png) {
        // Enable transparency
        await page.addStyleTag({
          content: ':root,body { background:transparent !important; }',
        })
      }

      const screenshot = async (pageNumber = 1) => {
        const clip = {
          x: 0,
          y: (pageNumber - 1) * tpl.rendered.size.height,
          ...tpl.rendered.size,
        } as const

        if (opts.type === ConvertType.jpeg)
          return await page.screenshot({
            clip,
            quality: opts.quality,
            type: 'jpeg',
          })

        return await page.screenshot({
          clip,
          omitBackground: true,
          type: 'png',
        })
      }

      if (opts.pages) {
        // Multiple images
        for (let page = 1; page <= tpl.rendered.length; page += 1) {
          const ret = file.convert(this.options.output, {
            page,
            extension: opts.type,
          })
          ret.buffer = Buffer.from(await screenshot(page))

          files.push(ret)
        }
      } else {
        // Title image
        const ret = file.convert(this.options.output, { extension: opts.type })
        ret.buffer = Buffer.from(await screenshot())

        files.push(ret)
      }
    })

    return files
  }

  private async convertFileToPPTX(
    tpl: TemplateResult,
    file: File,
    opts: Partial<ConvertImageOption> = {}
  ) {
    const imageFiles = await this.convertFileToImage(tpl, file, {
      ...opts,
      pages: true,
      type: ConvertType.png,
    })

    const pptx = new (await import('pptxgenjs')).default()
    const layoutName = `${tpl.rendered.size.width}x${tpl.rendered.size.height}`

    pptx.author = tpl.rendered.author ?? CREATED_BY_MARP
    pptx.company = CREATED_BY_MARP

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
    ret.buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer

    return ret
  }

  private async generateEngine(
    mergeOptions: MarpitOptions
  ): Promise<Marpit & { [engineInfo]?: EngineInfo }> {
    const { html, lang, options } = this.options
    const opts = { lang, ...options, ...mergeOptions, html }

    let engine = this.options.engine

    const isClass = (target: unknown): target is typeof Marpit =>
      typeof target === 'function' &&
      target.prototype &&
      Object.prototype.hasOwnProperty.call(target.prototype, 'constructor')

    if (typeof engine === 'function' && !isClass(engine)) {
      // Expose "marp" getter to allow accessing a bundled Marp Core instance
      const defaultEngine = await ResolvedEngine.resolveDefaultEngine()

      Object.defineProperty(opts, 'marp', {
        get: () => new defaultEngine.klass(opts),
      })

      // Resolve functional engine
      engine = await Promise.resolve(
        engine(opts as typeof opts & { readonly marp: Marp })
      )
    }

    if (isClass(engine)) engine = new engine(opts)

    // ---

    // Check engine interface
    if (!(typeof engine === 'object' && typeof engine.render === 'function'))
      error('Specified engine has not implemented render() method.')

    // Enable HTML tags
    if (html !== undefined) engine.markdown.set({ html })

    // Marpit plugins
    engine.use(metaPlugin).use(infoPlugin)

    if (this.options.type === ConvertType.pdf && this.options.pdfOutlines)
      engine.use(pdfOutlinePlugin)

    // Themes
    this.options.themeSet.registerTo(engine)

    return engine
  }

  private async usePuppeteer<T>(
    baseFile: File,
    processer: (
      page: Page,
      helpers: { render: () => Promise<void> }
    ) => Promise<T>
  ) {
    const tmpFile: File.TmpFileInterface | undefined = await (() => {
      if (!this.options.allowLocalFiles) return undefined

      warn(
        `Insecure local file accessing is enabled for conversion from ${baseFile.relativePath()}.`
      )

      // Snapd Chromium cannot access from sandbox container to user-land `/tmp`
      // directory so always create tmp file to home directory if in Linux.
      // (There is an exception for an official docker image)
      return baseFile.saveTmpFile({
        home: process.platform === 'linux' && !isOfficialDockerImage(),
        extension: '.html',
      })
    })()

    try {
      // timeout: this.puppeteerTimeout,
      const browser = await browserManager.browserForConversion()

      return await browser.withPage(async (page) => {
        page.setDefaultTimeout(this.puppeteerTimeout)

        const { missingFileSet, failedFileSet } =
          this.trackFailedLocalFileAccess(page)

        const uri = await (async () => {
          if (tmpFile) {
            if (await browser.browserInWSLHost()) {
              // Windows Chrome should read file from WSL environment
              return `file:${await resolveWSLPathToHost(tmpFile.path)}`
            }
            return `file://${tmpFile.path}`
          }
          return undefined
        })()

        const render = async () => {
          const waitForOptions: WaitForOptions = {
            waitUntil: ['domcontentloaded', 'networkidle0'],
          }

          if (uri) {
            await page.goto(uri, waitForOptions)
          } else {
            await page.goto('data:text/html,', waitForOptions)
            await page.setContent(baseFile.buffer!.toString(), waitForOptions)
          }
        }

        try {
          return await processer(page, { render })
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
        }
      })
    } finally {
      if (tmpFile) await tmpFile.cleanup()
    }
  }

  private trackFailedLocalFileAccess(page: Page): {
    missingFileSet: Set<string>
    failedFileSet: Set<string>
  } {
    const missingFileSet = new Set<string>()
    const failedFileSet = new Set<string>()

    page.on('requestfailed', (req: HTTPRequest) => {
      try {
        const url = new URL(req.url())
        if (url.protocol === 'file:') {
          if (req.failure()?.errorText === 'net::ERR_FILE_NOT_FOUND') {
            missingFileSet.add(url.href)
          } else {
            failedFileSet.add(url.href)
          }
        }
      } catch {
        // No ops
      }
    })

    return { missingFileSet, failedFileSet }
  }
}

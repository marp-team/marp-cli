import fs from 'fs'
import os from 'os'
import path from 'path'
import { URL } from 'url'
import { promisify } from 'util'
import Marp from '@marp-team/marp-core'
import { Options } from '@marp-team/marpit'
import cheerio from 'cheerio'
import { imageSize } from 'image-size'
import { PDFDocument, PDFDict, PDFName, PDFString, PDFHexString } from 'pdf-lib'
import { Page } from 'puppeteer-core/lib/cjs/puppeteer/common/Page'
import yauzl from 'yauzl'
import { Converter, ConvertType, ConverterOption } from '../src/converter'
import { CLIError } from '../src/error'
import { File, FileType } from '../src/file'
import { bare as bareTpl } from '../src/templates'
import { ThemeSet } from '../src/theme'
import { WatchNotifier } from '../src/watcher'

const puppeteerTimeoutMs = 15000

jest.mock('fs')

afterAll(() => Converter.closeBrowser())
afterEach(() => jest.restoreAllMocks())

describe('Converter', () => {
  const onePath = path.resolve(__dirname, '_files/1.md')
  const twoPath = path.resolve(__dirname, '_files/2.mdown')
  const threePath = path.resolve(__dirname, '_files/3.markdown')

  let themeSet: ThemeSet
  beforeEach(async () => (themeSet = await ThemeSet.initialize([])))

  const instance = (opts: Partial<ConverterOption> = {}) =>
    new Converter({
      themeSet,
      allowLocalFiles: false,
      engine: Marp,
      globalDirectives: {},
      lang: 'en',
      options: {},
      server: false,
      template: 'bare',
      templateOption: {},
      type: ConvertType.html,
      watch: false,
      ...opts,
    })

  describe('#constructor', () => {
    it('assigns initial options to options member', () => {
      const options = {
        themeSet,
        allowLocalFiles: true,
        engine: Marp,
        globalDirectives: { theme: 'default' },
        imageScale: 2,
        lang: 'fr',
        options: <Options>{ html: true },
        server: false,
        template: 'test-template',
        templateOption: {},
        type: ConvertType.html,
        watch: false,
      }

      expect(new Converter(options).options).toMatchObject(options)
    })
  })

  describe('get #template', () => {
    it('returns specified template', () => {
      expect(instance({ template: 'bare' }).template).toStrictEqual(bareTpl)
    })

    it('throws CLIError when specified template is not defined', () => {
      const throwErr = () => instance({ template: 'not_defined' }).template
      expect(throwErr).toThrow(CLIError)
    })
  })

  describe('#convert', () => {
    const md = '# <i>Hello!</i>'
    const dummyFile = new File(process.cwd())

    it('returns the result of template', async () => {
      const options: any = { html: true }
      const { result, rendered } = await instance({ options }).convert(md)

      expect(result).toMatch(/^<!DOCTYPE html>[\s\S]+<\/html>$/)
      expect(result).toContain(rendered.html)
      expect(result).toContain(rendered.css)
      expect(result).not.toContain('<base')
      expect(rendered.css).toContain('@theme default')
    })

    it('throws CLIError when selected engine is not implemented render() method', async () => {
      const subject = instance({
        engine: function () {
          // no ops
        },
      } as any).convert(md)
      await expect(subject).rejects.toBeInstanceOf(CLIError)
    })

    it('throws CLIError when selected template is not found', async () => {
      const subject = instance({ template: 'not-found' }).convert(md)
      await expect(subject).rejects.toBeInstanceOf(CLIError)
    })

    it('settings lang attribute of <html> by lang option', async () => {
      const { result } = await instance({ lang: 'zh' }).convert(md)
      expect(result).toContain('<html lang="zh">')
    })

    it("overrides html option by converter's html option", async () => {
      const defaultHtml = (await instance().convert('<i><br></i>')).rendered
      expect(defaultHtml.html).toContain('&lt;i&gt;<br />&lt;/i&gt;')

      const enabled = (await instance({ html: true }).convert(md)).rendered
      expect(enabled.html).toContain('<i>Hello!</i>')

      const disabled = (await instance({ html: false }).convert(md)).rendered
      expect(disabled.html).toContain('&lt;i&gt;Hello!&lt;/i&gt;')
    })

    describe('with globalDirectives option', () => {
      it('overrides theme directive', async () => {
        const { rendered } = await instance({
          globalDirectives: { theme: 'gaia' },
        }).convert(md)

        expect(rendered.css).toContain('@theme gaia')
      })

      it('overrides global directives for meta', async () => {
        const { result } = await instance({
          globalDirectives: {
            title: 'Title',
            description: 'Desc',
            url: 'https://example.com/canonical',
            image: 'https://example.com/image.jpg',
          },
        }).convert('---\ntitle: original\n---')

        expect(result).toContain('<title>Title</title>')
        expect(result).toContain('<meta name="description" content="Desc">')
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/canonical">'
        )
        expect(result).toContain(
          '<meta property="og:image" content="https://example.com/image.jpg">'
        )
      })

      it('allows reset meta values by empty string', async () => {
        const { result } = await instance({
          globalDirectives: { title: '', description: '', url: '', image: '' },
        }).convert(
          '---\ntitle: A\ndescription: B\nurl: https://example.com/\nimage: /hello.jpg\n---'
        )

        expect(result).not.toContain('<title>')
        expect(result).not.toContain('<meta name="description"')
        expect(result).not.toContain('<link rel="canonical"')
        expect(result).not.toContain('<meta property="og:image"')
      })

      describe('when given URL is invalid', () => {
        it('outputs warning and does not override URL', async () => {
          const warn = jest.spyOn(console, 'warn').mockImplementation()
          const { result } = await instance({
            globalDirectives: { url: '[INVALID]' },
          }).convert('---\nurl: https://example.com/\n---')

          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Specified canonical URL is ignored')
          )
          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('[INVALID]')
          )
          expect(result).toContain(
            '<link rel="canonical" href="https://example.com/">'
          )
        })
      })
    })

    for (const type of [ConvertType.pdf, ConvertType.png, ConvertType.jpeg]) {
      describe(`with ${type} convert type`, () => {
        it('adds <base> element with specified base path from passed file', async () => {
          const converter = instance({ type })
          const { result } = await converter.convert(md, dummyFile)

          const matched = result.match(/<base href="(.+?)">/)
          expect(matched).toBeTruthy()

          const url = new URL((matched && matched[1]) as string)
          expect(url.protocol).toBe('file:')

          const normalizedPath = path.resolve(
            url.pathname.slice(process.platform === 'win32' ? 1 : 0)
          )
          expect(normalizedPath).toBe(path.resolve(process.cwd()))
        })
      })
    }

    describe('with watch mode', () => {
      it('adds script for auto-reload', async () => {
        const converter = instance({ watch: true })
        const hash = WatchNotifier.sha256(process.cwd())

        const { result } = await converter.convert(md, dummyFile)
        expect(result).toContain(
          `<script>window.__marpCliWatchWS="ws://localhost:37717/${hash}";`
        )
      })
    })

    describe('with baseUrl option', () => {
      it('overrides <base> href attribute to specific URL in every kind of conversion', async () => {
        for (const type of Object.values(ConvertType)) {
          const converter = instance({ type, baseUrl: 'https://example.com/' })
          const { result } = await converter.convert(md, dummyFile)

          expect(result).toContain('<base href="https://example.com/">')
        }
      })
    })
  })

  describe('#convertFile', () => {
    it('rejects Promise when specified file is not found', () =>
      expect(
        (instance() as any).convertFile(new File('_NOT_FOUND_MARKDOWN_'))
      ).rejects.toBeTruthy())

    it('converts markdown file and save as html file by default', async () => {
      const write = (<any>fs).__mockWriteFile()
      await (<any>instance()).convertFile(new File(onePath))

      expect(write).toHaveBeenCalledWith(
        `${onePath.slice(0, -3)}.html`,
        expect.any(Buffer),
        expect.anything()
      )
    })

    it('converts markdown file and save to specified path when output is defined', async () => {
      const write = (<any>fs).__mockWriteFile()
      const output = './specified.html'
      await (<any>instance({ output })).convertFile(new File(twoPath))

      expect(write).toHaveBeenCalledWith(
        output,
        expect.any(Buffer),
        expect.anything()
      )
    })

    it('converts markdown file but not save when output is stdout', async () => {
      const write = (<any>fs).__mockWriteFile()
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      const output = '-'
      const ret = await (<any>instance({ output })).convertFile(
        new File(threePath)
      )

      expect(write).not.toHaveBeenCalled()
      expect(stdout).toHaveBeenCalledTimes(1)
      expect(ret.file.path).toBe(threePath)
      expect(ret.newFile.type).toBe(FileType.StandardIO)
    })

    describe('when convert type is PDF', () => {
      const pdfInstance = (opts: Partial<ConverterOption> = {}) =>
        instance({ ...opts, type: ConvertType.pdf })

      it(
        'converts markdown file into PDF',
        async () => {
          const write = (<any>fs).__mockWriteFile()
          const opts = { output: 'test.pdf' }
          const ret = await pdfInstance(opts).convertFile(new File(onePath))
          const pdf: Buffer = write.mock.calls[0][1]

          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('test.pdf')
          expect(pdf.toString('ascii', 0, 5)).toBe('%PDF-')
          expect(ret.newFile?.path).toBe('test.pdf')
          expect(ret.newFile?.buffer).toBe(pdf)
        },
        puppeteerTimeoutMs
      )

      describe('with meta global directives', () => {
        it(
          'assigns meta info thorugh pdf-lib',
          async () => {
            const write = (<any>fs).__mockWriteFile()

            await pdfInstance({
              output: 'test.pdf',
              globalDirectives: { title: 'title', description: 'description' },
            }).convertFile(new File(onePath))

            const pdf = await PDFDocument.load(write.mock.calls[0][1])

            expect(pdf.getTitle()).toBe('title')
            expect(pdf.getSubject()).toBe('description')
          },
          puppeteerTimeoutMs
        )
      })

      describe('with allowLocalFiles option as true', () => {
        it(
          'converts with using temporally file',
          async () => {
            const file = new File(onePath)

            const fileCleanup = jest.spyOn(<any>File.prototype, 'cleanup')
            const fileSave = jest
              .spyOn(File.prototype, 'save')
              .mockImplementation()

            const fileTmp = jest.spyOn(File.prototype, 'saveTmpFile')
            const warn = jest.spyOn(console, 'warn').mockImplementation()

            await pdfInstance({
              allowLocalFiles: true,
              output: '-',
            }).convertFile(file)

            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining(
                'Insecure local file accessing is enabled'
              )
            )
            expect(fileTmp).toHaveBeenCalledWith(
              expect.objectContaining({ extension: '.html' })
            )
            expect(fileCleanup).toHaveBeenCalledWith(
              expect.stringContaining(os.tmpdir())
            )
            expect(fileSave).toHaveBeenCalled()
          },
          puppeteerTimeoutMs
        )
      })

      describe('with pdfNotes option as true', () => {
        it(
          'assigns presenter notes as annotation of PDF',
          async () => {
            const write = (<any>fs).__mockWriteFile()

            await pdfInstance({
              output: 'test.pdf',
              pdfNotes: true,
            }).convertFile(new File(threePath))

            const pdf = await PDFDocument.load(write.mock.calls[0][1])
            const annotaionRef = pdf.getPage(0).node.Annots()?.get(0)
            const annotation = pdf.context.lookup(annotaionRef, PDFDict)

            const kv = (name: string) => annotation.get(PDFName.of(name))

            expect(kv('Subtype')).toBe(PDFName.of('Text')) // Annotation type
            expect(kv('Name')).toBe(PDFName.of('Note')) // The kind of icon
            expect(kv('Contents')).toStrictEqual(
              PDFHexString.fromText('presenter note')
            )
          },
          puppeteerTimeoutMs
        )
      })
    })

    describe('when convert type is PPTX', () => {
      let write: jest.Mock

      beforeEach(() => {
        write = (<any>fs).__mockWriteFile()
      })

      const converter = (opts: Partial<ConverterOption> = {}) =>
        instance({ output: 'test.pptx', type: ConvertType.pptx, ...opts })

      const getPptxDocProps = async (buffer: Buffer) => {
        // Require to ignore type definition by casting into any :(
        // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20497
        const zip = await (promisify(yauzl.fromBuffer) as any)(buffer, {
          lazyEntries: true,
        })

        return await new Promise<Record<string, string>>((res, rej) => {
          const meta: Record<string, string> = {}

          zip.on('error', (err) => rej(err))
          zip.on('entry', (entry) => {
            // Read document property from `docProps/core.xml`
            if (entry.fileName === 'docProps/core.xml') {
              zip.openReadStream(entry, (err, readStream) => {
                if (err) return rej(err)

                const readBuffer: Buffer[] = []

                readStream.on('data', (chunk) => readBuffer.push(chunk))
                readStream.on('end', () => {
                  const $ = cheerio.load(Buffer.concat(readBuffer).toString())
                  const coreProps = $('cp\\:coreProperties')

                  coreProps.children().each((_, elm) => {
                    meta[elm['tagName']] = $(elm).text()
                  })

                  zip.readEntry()
                })
              })
            } else {
              zip.readEntry()
            }
          })
          zip.on('end', () => res(meta))
          zip.readEntry()
        })
      }

      it(
        'converts markdown file into PPTX',
        async () => {
          const setViewport = jest.spyOn(Page.prototype, 'setViewport')

          await converter().convertFile(new File(onePath))
          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('test.pptx')

          // It has a different default scale x2.5
          expect(setViewport).toHaveBeenCalledWith(
            expect.objectContaining({ deviceScaleFactor: 2.5 })
          )

          // ZIP PK header for Office Open XML
          const pptx: Buffer = write.mock.calls[0][1]
          expect(pptx.toString('ascii', 0, 2)).toBe('PK')
          expect(pptx.toString('hex', 2, 4)).toBe('0304')

          // Creator meta
          const meta = await getPptxDocProps(pptx)
          expect(meta['dc:creator']).toBe('Created by Marp')
        },
        puppeteerTimeoutMs
      )

      describe('with meta global directives', () => {
        it(
          'assigns meta info thorugh PptxGenJs',
          async () => {
            const setViewport = jest.spyOn(Page.prototype, 'setViewport')

            await converter({
              imageScale: 1,
              globalDirectives: {
                title: 'Test meta',
                description: 'Test description',
              },
            }).convertFile(new File(onePath))

            const pptx: Buffer = write.mock.calls[0][1]
            const meta = await getPptxDocProps(pptx)

            expect(meta['dc:title']).toBe('Test meta')
            expect(meta['dc:subject']).toBe('Test description')

            // Custom scale
            expect(setViewport).toHaveBeenCalledWith(
              expect.objectContaining({ deviceScaleFactor: 1 })
            )
          },
          puppeteerTimeoutMs
        )
      })
    })

    describe('when convert type is PNG', () => {
      let write: jest.Mock

      beforeEach(() => {
        write = (<any>fs).__mockWriteFile()
      })

      it(
        'converts markdown file into PNG',
        async () => {
          await instance({
            output: 'a.png',
            type: ConvertType.png,
          }).convertFile(new File(onePath))

          const png: Buffer = write.mock.calls[0][1]

          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('a.png')
          expect(png.toString('ascii', 1, 4)).toBe('PNG')

          const { width, height } = imageSize(png)
          expect(width).toBe(1280)
          expect(height).toBe(720)
        },
        puppeteerTimeoutMs
      )

      describe('with 4:3 size global directive for Marp Core', () => {
        const slide43Path = twoPath

        it(
          'converts into 4:3 PNG',
          async () => {
            await instance({
              output: 'a.png',
              type: ConvertType.png,
            }).convertFile(new File(slide43Path))
            const png: Buffer = write.mock.calls[0][1]

            const { width, height } = imageSize(png)
            expect(width).toBe(960)
            expect(height).toBe(720)
          },
          puppeteerTimeoutMs
        )
      })

      describe('with imageScale option', () => {
        it(
          'applies the scale factor to PNG',
          async () => {
            await instance({
              output: 'a.png',
              type: ConvertType.png,
              imageScale: 0.5,
            }).convertFile(new File(onePath))

            const png: Buffer = write.mock.calls[0][1]
            expect(png).toBeTruthy()

            const { width, height } = imageSize(png)
            expect(width).toBe(640)
            expect(height).toBe(360)
          },
          puppeteerTimeoutMs
        )
      })
    })

    describe('when convert type is JPEG', () => {
      let write: jest.Mock

      beforeEach(() => {
        write = (<any>fs).__mockWriteFile()
      })

      it(
        'converts markdown file into JPEG',
        async () => {
          await instance({
            output: 'b.jpg',
            type: ConvertType.jpeg,
          }).convertFile(new File(onePath))

          const jpeg: Buffer = write.mock.calls[0][1]

          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('b.jpg')
          expect(jpeg[0]).toBe(0xff)
          expect(jpeg[1]).toBe(0xd8)

          const { width, height } = imageSize(jpeg)
          expect(width).toBe(1280)
          expect(height).toBe(720)
        },
        puppeteerTimeoutMs
      )

      describe('with 4:3 size global directive for Marp Core', () => {
        const slide43Path = twoPath

        it(
          'converts into 4:3 JPEG',
          async () => {
            await instance({
              output: 'b.jpg',
              type: ConvertType.jpeg,
            }).convertFile(new File(slide43Path))

            const jpeg: Buffer = write.mock.calls[0][1]

            const { width, height } = imageSize(jpeg)
            expect(width).toBe(960)
            expect(height).toBe(720)
          },
          puppeteerTimeoutMs
        )
      })

      describe('with imageScale option', () => {
        it(
          'applies the scale factor to PNG',
          async () => {
            await instance({
              output: 'b.jpg',
              type: ConvertType.jpeg,
              imageScale: 0.5,
            }).convertFile(new File(onePath))

            const jpeg: Buffer = write.mock.calls[0][1]
            expect(jpeg).toBeTruthy()

            const { width, height } = imageSize(jpeg)
            expect(width).toBe(640)
            expect(height).toBe(360)
          },
          puppeteerTimeoutMs
        )
      })
    })

    describe('when pages option is true', () => {
      let converter: Converter
      let write: jest.Mock

      beforeEach(() => {
        converter = instance({
          output: 'c.png',
          pages: true,
          type: ConvertType.png,
        })
        write = (<any>fs).__mockWriteFile()
      })

      it(
        'converts markdown file into multiple PNG files',
        async () => {
          await converter.convertFile(new File(onePath)) // 2 pages

          expect(write).toHaveBeenCalledTimes(2)
          expect(write.mock.calls[0][0]).toBe('c.001.png')
          expect(write.mock.calls[1][0]).toBe('c.002.png')
        },
        puppeteerTimeoutMs
      )
    })
  })

  describe('#convertFiles', () => {
    describe('with multiple files', () => {
      it('converts passed files', async () => {
        const write = (<any>fs).__mockWriteFile()

        await instance().convertFiles([new File(onePath), new File(twoPath)])
        expect(write).toHaveBeenCalledTimes(2)
        expect(write.mock.calls[0][0]).toBe(`${onePath.slice(0, -3)}.html`)
        expect(write.mock.calls[1][0]).toBe(`${twoPath.slice(0, -6)}.html`)
      })

      it('throws CLIError when output is defined', () =>
        expect(
          instance({ output: 'test' }).convertFiles([
            new File(onePath),
            new File(twoPath),
          ])
        ).rejects.toBeInstanceOf(CLIError))

      it('converts passed files when output is stdout', async () => {
        const write = (<any>fs).__mockWriteFile()
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()
        const files = [new File(onePath), new File(twoPath)]

        await instance({ output: '-' }).convertFiles(files, {
          onConverted: (result) => expect(files).toContain(result.file),
        })

        expect(write).not.toHaveBeenCalled()
        expect(stdout).toHaveBeenCalledTimes(2)
      })
    })
  })
})

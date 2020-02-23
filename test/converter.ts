import Marp from '@marp-team/marp-core'
import { Options } from '@marp-team/marpit'
import cheerio from 'cheerio'
import fs from 'fs'
import { imageSize } from 'image-size'
import os from 'os'
import path from 'path'
import { URL } from 'url'
import { promisify } from 'util'
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

    it('throws CLIError when selected engine is not implemented render() method', () => {
      const subject = instance(<any>{ engine: function _() {} }).convert(md)
      expect(subject).rejects.toBeInstanceOf(CLIError)
    })

    it('throws CLIError when selected template is not found', () => {
      const subject = instance({ template: 'not-found' }).convert(md)
      expect(subject).rejects.toBeInstanceOf(CLIError)
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

    context('with globalDirectives option', () => {
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

      context('when given URL is invalid', () => {
        it('outputs warning and does not override URL', async () => {
          const warn = jest.spyOn(console, 'warn').mockImplementation()
          const { result } = await instance({
            globalDirectives: { url: '[INVALID]' },
          }).convert('---\nurl: https://example.com/\n---')

          expect(warn).toBeCalledWith(
            expect.stringContaining('Specified canonical URL is ignored')
          )
          expect(warn).toBeCalledWith(expect.stringContaining('[INVALID]'))
          expect(result).toContain(
            '<link rel="canonical" href="https://example.com/">'
          )
        })
      })
    })

    for (const type of [ConvertType.pdf, ConvertType.png, ConvertType.jpeg]) {
      context(`with ${type} convert type`, () => {
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

    context('with watch mode', () => {
      it('adds script for auto-reload', async () => {
        const converter = instance({ watch: true })
        const hash = WatchNotifier.sha256(process.cwd())

        const { result } = await converter.convert(md, dummyFile)
        expect(result).toContain(
          `<script>window\.__marpCliWatchWS="ws://localhost:37717/${hash}";`
        )
      })
    })
  })

  describe('#convertFile', () => {
    it('rejects Promise when specified file is not found', () => {
      expect(
        (<any>instance()).convertFile(new File('_NOT_FOUND_MARKDOWN_'))
      ).rejects.toBeTruthy()
    })

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

    context('when convert type is PDF', () => {
      const pdfInstance = (opts = {}) =>
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
          expect(ret.newFile!.path).toBe('test.pdf')
          expect(ret.newFile!.buffer).toBe(pdf)
        },
        puppeteerTimeoutMs
      )

      context('with allowLocalFiles option as true', () => {
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

            expect(warn).toBeCalledWith(
              expect.stringContaining(
                'Insecure local file accessing is enabled'
              )
            )
            expect(fileTmp).toBeCalledWith(
              expect.objectContaining({ extension: '.html' })
            )
            expect(fileCleanup).toBeCalledWith(
              expect.stringContaining(os.tmpdir())
            )
            expect(fileSave).toBeCalled()
          },
          puppeteerTimeoutMs
        )
      })
    })

    context('when convert type is PPTX', () => {
      let write: jest.Mock

      beforeEach(() => {
        write = (<any>fs).__mockWriteFile()
      })

      const converter = (opts: Partial<ConverterOption> = {}) =>
        instance({ output: 'test.pptx', type: ConvertType.pptx, ...opts })

      const getPptxDocProps = async (buffer: Buffer) => {
        const zip = await promisify(yauzl.fromBuffer)(buffer, {
          lazyEntries: true,
        })

        return await new Promise<Record<string, string>>((res, rej) => {
          const meta: Record<string, string> = {}

          zip.on('error', err => rej(err))
          zip.on('entry', entry => {
            // Read document property from `docProps/core.xml`
            if (entry.fileName === 'docProps/core.xml') {
              zip.openReadStream(entry, (err, readStream) => {
                if (err) return rej(err)

                const readBuffer: Buffer[] = []

                readStream.on('data', chunk => readBuffer.push(chunk))
                readStream.on('end', () => {
                  const $ = cheerio.load(Buffer.concat(readBuffer).toString())
                  const coreProps = $('cp\\:coreProperties')

                  coreProps.children().each((_, elm) => {
                    meta[elm.tagName] = $(elm).text()
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
          await converter().convertFile(new File(onePath))
          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('test.pptx')

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

      context('with meta global directives', () => {
        it(
          'assigns meta info thorugh PptxGenJs',
          async () => {
            await converter({
              globalDirectives: {
                title: 'Test meta',
                description: 'Test description',
              },
            }).convertFile(new File(onePath))

            const pptx: Buffer = write.mock.calls[0][1]
            const meta = await getPptxDocProps(pptx)

            expect(meta['dc:title']).toBe('Test meta')
            expect(meta['dc:subject']).toBe('Test description')
          },
          puppeteerTimeoutMs
        )
      })
    })

    context('when convert type is PNG', () => {
      let converter: Converter
      let write: jest.Mock

      beforeEach(() => {
        converter = instance({ output: 'a.png', type: ConvertType.png })
        write = (<any>fs).__mockWriteFile()
      })

      it(
        'converts markdown file into PNG',
        async () => {
          await converter.convertFile(new File(onePath))
          const png: Buffer = write.mock.calls[0][1]

          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('a.png')
          expect(png.toString('ascii', 1, 4)).toBe('PNG')

          const { width, height } = imageSize(png) as any
          expect(width).toBe(1280)
          expect(height).toBe(720)
        },
        puppeteerTimeoutMs
      )

      context('with 4:3 size global directive for Marp Core', () => {
        const slide43Path = twoPath

        it(
          'converts into 4:3 PNG',
          async () => {
            await converter.convertFile(new File(slide43Path))
            const png: Buffer = write.mock.calls[0][1]

            const { width, height } = imageSize(png) as any
            expect(width).toBe(960)
            expect(height).toBe(720)
          },
          puppeteerTimeoutMs
        )
      })
    })

    context('when convert type is JPEG', () => {
      let converter: Converter
      let write: jest.Mock

      beforeEach(() => {
        converter = instance({ output: 'b.jpg', type: ConvertType.jpeg })
        write = (<any>fs).__mockWriteFile()
      })

      it(
        'converts markdown file into JPEG',
        async () => {
          await converter.convertFile(new File(onePath))
          const jpeg: Buffer = write.mock.calls[0][1]

          expect(write).toHaveBeenCalled()
          expect(write.mock.calls[0][0]).toBe('b.jpg')
          expect(jpeg[0]).toBe(0xff)
          expect(jpeg[1]).toBe(0xd8)

          const { width, height } = imageSize(jpeg) as any
          expect(width).toBe(1280)
          expect(height).toBe(720)
        },
        puppeteerTimeoutMs
      )

      context('with 4:3 size global directive for Marp Core', () => {
        const slide43Path = twoPath

        it(
          'converts into 4:3 JPEG',
          async () => {
            await converter.convertFile(new File(slide43Path))
            const jpeg: Buffer = write.mock.calls[0][1]

            const { width, height } = imageSize(jpeg) as any
            expect(width).toBe(960)
            expect(height).toBe(720)
          },
          puppeteerTimeoutMs
        )
      })
    })

    context('when pages option is true', () => {
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

          expect(write).toBeCalledTimes(2)
          expect(write.mock.calls[0][0]).toBe('c.001.png')
          expect(write.mock.calls[1][0]).toBe('c.002.png')
        },
        puppeteerTimeoutMs
      )
    })
  })

  describe('#convertFiles', () => {
    context('with multiple files', () => {
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
          onConverted: result => expect(files.includes(result.file)).toBe(true),
        })

        expect(write).not.toHaveBeenCalled()
        expect(stdout).toHaveBeenCalledTimes(2)
      })
    })
  })
})

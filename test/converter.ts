import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { URL } from 'node:url'
import { promisify } from 'node:util'
import { Marp } from '@marp-team/marp-core'
import { Options } from '@marp-team/marpit'
import { load } from 'cheerio'
import { imageSize } from 'image-size'
import { PDFDocument, PDFDict, PDFName, PDFHexString, PDFNumber } from 'pdf-lib'
import { TimeoutError } from 'puppeteer-core'
import { fromBuffer as yauzlFromBuffer } from 'yauzl'
import { BrowserManager } from '../src/browser/manager'
import { Converter, ConvertType, ConverterOption } from '../src/converter'
import { CLIError, CLIErrorCode } from '../src/error'
import { File, FileType } from '../src/file'
import * as sofficeFinder from '../src/soffice/finder'
import { SOffice } from '../src/soffice/soffice'
import { bare as bareTpl } from '../src/templates'
import { ThemeSet } from '../src/theme'
import { WatchNotifier } from '../src/watcher'

const timeout = 60000
const timeoutLarge = 120000

let mkdirSpy: jest.SpiedFunction<typeof fs.promises.mkdir>
let writeFileSpy: jest.SpiedFunction<typeof fs.promises.writeFile>

beforeEach(() => {
  mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockImplementation()
  writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('Converter', () => {
  const onePath = path.resolve(__dirname, '_files/1.md')
  const twoPath = path.resolve(__dirname, '_files/2.mdown')
  const threePath = path.resolve(__dirname, '_files/3.markdown')

  let browserManager: BrowserManager
  let themeSet: ThemeSet

  beforeEach(async () => {
    browserManager = new BrowserManager({
      finders: ['chrome', 'edge'],
      protocol: 'cdp',
      timeout,
    })
    themeSet = await ThemeSet.initialize([])
  })

  afterEach(async () => {
    await browserManager.dispose()
  }, timeout)

  const instance = (opts: Partial<ConverterOption> = {}) =>
    new Converter({
      browserManager,
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
    it('assigns initial options to options member', async () => {
      await using browserManager = new BrowserManager({ timeout: 12345 })

      const options = {
        browserManager,
        themeSet,
        allowLocalFiles: true,
        engine: Marp,
        globalDirectives: { theme: 'default' },
        imageScale: 2,
        lang: 'fr',
        options: { html: true } as Options,
        parallel: 3,
        server: false,
        template: 'test-template',
        templateOption: {},
        type: ConvertType.html,
        watch: false,
      } as const satisfies ConverterOption

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
      const options = { html: true } as any
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

    it('prefers lang specified in Markdown than lang option', async () => {
      const { result } = await instance().convert('<!-- lang: fr -->')
      expect(result).toContain('<html lang="fr">')
    })

    it("overrides html option by converter's html option", async () => {
      const htmlMd = '<i><br><button>test</button></i>'

      const defaultHtml = (await instance().convert(htmlMd)).rendered
      expect(defaultHtml.html).toContain(
        '<i><br />&lt;button&gt;test&lt;/button&gt;</i>'
      )

      const enabled = (await instance({ html: true }).convert(htmlMd)).rendered
      expect(enabled.html).toContain('<i><br /><button>test</button></i>')

      const disabled = (await instance({ html: false }).convert(htmlMd))
        .rendered
      expect(disabled.html).toContain(
        '&lt;i&gt;&lt;br&gt;&lt;button&gt;test&lt;/button&gt;&lt;/i&gt;'
      )
    })

    it('correctly applies overridden global directives even if enabled HTML option', async () => {
      const { rendered } = await instance({
        html: true,
        globalDirectives: { title: 'Hello' },
      }).convert('<p>test</p>')

      expect(rendered.title).toBe('Hello')
    })

    it('strips UTF-8 BOM', async () => {
      const noBOM = await instance().convert('---\ntitle: test\n---')
      const BOM = await instance().convert('\ufeff---\ntitle: test\n---')

      expect(BOM.result).toStrictEqual(noBOM.result)
      expect(BOM.rendered.title).toBe('test')
    })

    describe('with functional engine', () => {
      // A functional engine should be a pure function that its prototype has
      // no constructor property. Jest function mock has a constructor
      // property so we have to wrap it.
      const createFunctionalEngine = (fn: (opts: any) => any) => {
        const spy = jest.fn(fn)
        return { func: ((opts: any) => spy(opts)) as any, spy }
      }

      it('exposes Marp / Marpit options to an argument of functional engine', async () => {
        const engine = createFunctionalEngine((opts) => new Marp(opts))

        await instance({
          engine: engine.func,
          options: { printable: false },
        }).convert(md)

        expect(engine.spy.mock.calls[0][0]).toMatchObject({
          printable: false,
        })
      })

      it('exposes marp getter to allow using built-in Marp Core instance with current options', async () => {
        const plugin = jest.fn()
        const engine = createFunctionalEngine(({ marp }) => marp.use(plugin))

        await instance({
          engine: engine.func,
          options: { printable: false },
        }).convert(md)

        expect(engine.spy.mock.calls[0][0]).toHaveProperty(
          'marp',
          expect.any(Marp)
        )

        expect(engine.spy.mock.calls[0][0].marp.options).toMatchObject({
          printable: false,
        })

        expect(plugin).toHaveBeenCalledWith(
          expect.objectContaining({ marpit: expect.any(Marp) })
        )
      })
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
            author: 'Author',
            keywords: ['a', '"b"', 'c'],
            url: 'https://example.com/canonical',
            image: 'https://example.com/image.jpg',
          },
        }).convert('---\ntitle: original\n---')

        expect(result).toContain('<title>Title</title>')
        expect(result).toContain('<meta name="description" content="Desc">')
        expect(result).toContain('<meta name="author" content="Author">')
        expect(result).toContain(
          '<meta name="keywords" content="a,&quot;b&quot;,c">'
        )
        expect(result).toContain(
          '<link rel="canonical" href="https://example.com/canonical">'
        )
        expect(result).toContain(
          '<meta property="og:image" content="https://example.com/image.jpg">'
        )
      })

      it('allows reset meta values by empty string / array', async () => {
        const { result } = await instance({
          globalDirectives: {
            title: '',
            description: '',
            author: '',
            keywords: [],
            url: '',
            image: '',
          },
        }).convert(
          '---\ntitle: A\ndescription: B\nauthor: C\nkeywords: D\nurl: https://example.com/\nimage: /hello.jpg\n---'
        )

        expect(result).not.toContain('<title>')
        expect(result).not.toContain('<meta name="description"')
        expect(result).not.toContain('<meta name="author"')
        expect(result).not.toContain('<meta name="keywords"')
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

    describe('Template specifics', () => {
      it('uses bespoke template specific Marpit plugins if enabled transition option', async () => {
        // Footer directive is required for testing the condition about inline mode
        const transitionMd =
          '<!-- transition: cover -->\n<!-- footer: test -->\n\n---\n\n'

        // Disabled
        const { result: disabledResult } = await instance({
          template: 'bespoke',
          templateOption: { transition: false },
        }).convert(transitionMd)

        const $disabled = load(disabledResult)

        expect($disabled('[data-transition]')).toHaveLength(0)
        expect($disabled('[data-transition-back]')).toHaveLength(0)

        // Enabled
        const { result: enabledResult } = await instance({
          template: 'bespoke',
          templateOption: { transition: true },
        }).convert(transitionMd)

        const $enabled = load(enabledResult)

        expect($enabled('[data-transition]').length).toBeGreaterThanOrEqual(1)
        expect(
          $enabled('[data-transition-back]').length
        ).toBeGreaterThanOrEqual(1)

        const enabledData = $enabled('[data-transition]').data('transition')
        const enabledDataBack = $enabled('[data-transition-back]').data(
          'transitionBack'
        )

        expect(enabledData.name).toBe('cover')
        expect(enabledData.builtinFallback).toBe(true)
        expect(enabledDataBack.name).toBe('cover')
        expect(enabledDataBack.builtinFallback).toBe(true)

        // Non built-in transition will remain for custom transition
        const { result: unknownResult } = await instance({
          template: 'bespoke',
          templateOption: { transition: true },
        }).convert('<!-- transition: unknown -->')

        const $unknown = load(unknownResult)
        expect($unknown('[data-transition]')).toHaveLength(1)

        const unknownData = $unknown('[data-transition]').data('transition')
        expect(unknownData.name).toBe('unknown')
        expect(unknownData.builtinFallback).toBeFalsy()

        // Turn on and off
        const { result: toggleResult } = await instance({
          template: 'bespoke',
          templateOption: { transition: true },
        }).convert(
          '<!-- transition: reveal -->\n\n---\n\n<!-- transition: none -->\n\n---\n\n'
        )

        const $toggle = load(toggleResult)
        const sections = $toggle('section')

        expect(sections).toHaveLength(3)

        expect($toggle(sections[0]).data('transition').name).toBe('reveal')
        expect($toggle(sections[1]).data('transition').name).toBe('none')
        expect($toggle(sections[2]).data('transition').name).toBe('none')

        // Assigning slides are shifted in backward transition
        expect($toggle(sections[0]).data('transitionBack')).toBeUndefined()
        expect($toggle(sections[1]).data('transitionBack').name).toBe('reveal')
        expect($toggle(sections[2]).data('transitionBack').name).toBe('none')
      })
    })

    describe('with space-separated duration', () => {
      it('defines configured values', async () => {
        const converter = instance({
          template: 'bespoke',
          templateOption: { transition: true },
        })

        const { result } = await converter.convert(
          '<!-- transition: reveal 1s -->'
        )

        const $result = load(result)
        const data = $result('section').first().data('transition')

        expect(data.name).toBe('reveal')
        expect(data.duration).toBe('1s')
      })
    })

    describe('with scoped style', () => {
      it('assigns transition data with the scoped name of keyframes', async () => {
        const converter = instance({
          template: 'bespoke',
          templateOption: { transition: true },
        })

        const { result } = await converter.convert(
          [
            '<!-- transition: hello -->',
            '<style scoped>',
            '  @keyframes marp-transition-hello { to { opacity: 0; } }',
            '</style>',
            '\n---\n',
          ].join('\n')
        )
        const $result = load(result)

        const data = $result('section').first().data('transition')
        expect(data.name).toMatch(/^hello-\w+$/)

        const bData = $result($result('section').get(1)).data('transitionBack')
        expect(bData.name).toMatch(/^hello-\w+$/)
        expect(bData.name).toBe(data.name)
      })
    })
  })

  describe('#convertFile', () => {
    it('rejects Promise when specified file is not found', () =>
      expect(
        instance().convertFile(new File('_NOT_FOUND_MARKDOWN_'))
      ).rejects.toBeTruthy())

    it('converts markdown file and save as html file by default', async () => {
      await instance().convertFile(new File(onePath))

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        `${onePath.slice(0, -3)}.html`,
        expect.any(Buffer)
      )
    })

    it('converts markdown file and save to specified path when output is defined', async () => {
      const output = './specified.html'
      await instance({ output }).convertFile(new File(twoPath))

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        output,
        expect.any(Buffer)
      )
    })

    it('tries to create the directory of output file when saving', async () => {
      const output = path.resolve(__dirname, '__test_dir__/out.html')
      await instance({ output }).convertFile(new File(twoPath))

      expect(fs.promises.writeFile).toHaveBeenCalled()
      expect(mkdirSpy).toHaveBeenCalledWith(
        path.resolve(__dirname, '__test_dir__'),
        { recursive: true }
      )
    })

    it('does not try to create the directory of output file when saving to the root', async () => {
      const output = '/out.html'
      await instance({ output }).convertFile(new File(twoPath))

      expect(fs.promises.writeFile).toHaveBeenCalled()
      expect(mkdirSpy).not.toHaveBeenCalled()
    })

    it('converts markdown file but not save when output is stdout', async () => {
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      const output = '-'
      const ret = await instance({ output }).convertFile(new File(threePath))

      expect(fs.promises.writeFile).not.toHaveBeenCalled()
      expect(stdout).toHaveBeenCalledTimes(1)
      expect(ret.file.path).toBe(threePath)
      expect(ret.newFile?.type).toBe(FileType.StandardIO)
    })

    describe('when convert type is PDF', () => {
      const pdfInstance = (opts: Partial<ConverterOption> = {}) =>
        instance({ ...opts, type: ConvertType.pdf })

      it(
        'converts markdown file into PDF',
        async () => {
          const opts = { output: 'test.pdf' }
          const ret = await pdfInstance(opts).convertFile(new File(onePath))

          expect(fs.promises.writeFile).toHaveBeenCalled()
          expect(writeFileSpy.mock.calls[0][0]).toBe('test.pdf')
          expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

          const pdf = writeFileSpy.mock.calls[0][1] as Buffer
          expect(pdf.toString('ascii', 0, 5)).toBe('%PDF-')
          expect(ret.newFile?.path).toBe('test.pdf')
          expect(ret.newFile?.buffer).toBe(pdf)
        },
        timeout
      )

      describe('with meta global directives', () => {
        it(
          'assigns meta info thorugh pdf-lib',
          async () => {
            await pdfInstance({
              output: 'test.pdf',
              globalDirectives: {
                title: 'title',
                description: 'description',
                author: 'author',
                keywords: ['a', 'b', 'c'],
              },
            }).convertFile(new File(onePath))

            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const pdf = await PDFDocument.load(
              writeFileSpy.mock.calls[0][1] as Buffer
            )
            expect(pdf.getTitle()).toBe('title')
            expect(pdf.getSubject()).toBe('description')
            expect(pdf.getAuthor()).toBe('author')
            expect(pdf.getKeywords()).toBe('a; b; c')
          },
          timeout
        )
      })

      describe('with allowLocalFiles option as true', () => {
        beforeEach(() => {
          // Don't mock writeFile to use actually saved tmp file for conversion
          writeFileSpy.mockRestore()
        })

        it(
          'converts with using temporary file for local file access',
          async () => {
            const file = new File(onePath)

            const unlink = jest.spyOn(fs.promises, 'unlink')
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
            expect(unlink).toHaveBeenCalledWith(
              expect.stringContaining(os.tmpdir())
            )
            expect(fileSave).toHaveBeenCalled()
          },
          timeout
        )
      })

      describe('with pdfNotes option as true', () => {
        it(
          'assigns presenter notes as annotation of PDF',
          async () => {
            await pdfInstance({
              output: 'test.pdf',
              pdfNotes: true,
            }).convertFile(new File(threePath))

            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const pdf = await PDFDocument.load(
              writeFileSpy.mock.calls[0][1] as Buffer
            )
            const annotaionRef = pdf.getPage(0).node.Annots()?.get(0)
            const annotation = pdf.context.lookup(annotaionRef, PDFDict)

            const kv = (name: string) => annotation.get(PDFName.of(name))

            expect(kv('Subtype')).toBe(PDFName.of('Text')) // Annotation type
            expect(kv('Name')).toBe(PDFName.of('Note')) // The kind of icon
            expect(kv('Contents')).toStrictEqual(
              PDFHexString.fromText('presenter note')
            )
          },
          timeout
        )

        it('sets a comment author to notes if set author global directive', async () => {
          await pdfInstance({
            output: 'test.pdf',
            pdfNotes: true,
            globalDirectives: { author: 'author' },
          }).convertFile(new File(threePath))

          expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

          const pdf = await PDFDocument.load(
            writeFileSpy.mock.calls[0][1] as Buffer
          )
          const annotaionRef = pdf.getPage(0).node.Annots()?.get(0)
          const annotation = pdf.context.lookup(annotaionRef, PDFDict)

          expect(annotation.get(PDFName.of('T'))).toStrictEqual(
            PDFHexString.fromText('author')
          )
        })
      })

      describe('with pdfOutlines option', () => {
        type SerializedOutline = [
          name: string | undefined,
          children: SerializedOutline[],
        ]

        const getOutline = (outline: PDFDict): SerializedOutline => {
          const title = outline
            .lookupMaybe(PDFName.of('Title'), PDFHexString)
            ?.decodeText()

          const childDicts: PDFDict[] = []
          let child = outline.lookupMaybe(PDFName.of('First'), PDFDict)

          while (child) {
            childDicts.push(child)
            child = child.lookupMaybe(PDFName.of('Next'), PDFDict)
          }

          return [title, childDicts.map(getOutline)]
        }

        const baseFile = () => {
          const file = new File(onePath)
          file.buffer = Buffer.from(
            [
              '# 1',
              '## 2',
              '#### 4',
              '### 3',
              '\n---\n',
              '##### 5',
              '## 2-2',
              '\n---\n',
              '### 4-2',
            ].join('\n')
          )

          return file
        }

        describe('with full detailed options', () => {
          it(
            'assigns outlines for pages and headings to PDF',
            async () => {
              await pdfInstance({
                output: 'test.pdf',
                pdfOutlines: { pages: true, headings: true },
              }).convertFile(baseFile())

              expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

              const pdf = await PDFDocument.load(
                writeFileSpy.mock.calls[0][1] as Buffer
              )
              const outlines = pdf.catalog.lookup(
                PDFName.of('Outlines'),
                PDFDict
              )

              expect(outlines.lookup(PDFName.of('Type'))).toStrictEqual(
                PDFName.of('Outlines')
              )
              expect(outlines.lookup(PDFName.of('Count'))).toStrictEqual(
                PDFNumber.of(10) // Opening 3 pages + 7 headings
              )

              expect(getOutline(outlines)[1]).toMatchInlineSnapshot(`
                [
                  [
                    "Page 1",
                    [
                      [
                        "1",
                        [
                          [
                            "2",
                            [
                              [
                                "4",
                                [],
                              ],
                              [
                                "3",
                                [],
                              ],
                            ],
                          ],
                        ],
                      ],
                    ],
                  ],
                  [
                    "Page 2",
                    [
                      [
                        "5",
                        [],
                      ],
                      [
                        "2-2",
                        [],
                      ],
                    ],
                  ],
                  [
                    "Page 3",
                    [
                      [
                        "4-2",
                        [],
                      ],
                    ],
                  ],
                ]
              `)
            },
            timeout
          )
        })

        describe('only with pages options', () => {
          it(
            'assigns page outlines to PDF',
            async () => {
              await pdfInstance({
                output: 'test.pdf',
                pdfOutlines: { pages: true, headings: false },
              }).convertFile(baseFile())

              expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

              const pdf = await PDFDocument.load(
                writeFileSpy.mock.calls[0][1] as Buffer
              )
              const outlines = pdf.catalog.lookup(
                PDFName.of('Outlines'),
                PDFDict
              )

              expect(outlines.lookup(PDFName.of('Type'))).toStrictEqual(
                PDFName.of('Outlines')
              )
              expect(outlines.lookup(PDFName.of('Count'))).toStrictEqual(
                PDFNumber.of(3) // 3 pages
              )

              expect(getOutline(outlines)[1]).toMatchInlineSnapshot(`
                [
                  [
                    "Page 1",
                    [],
                  ],
                  [
                    "Page 2",
                    [],
                  ],
                  [
                    "Page 3",
                    [],
                  ],
                ]
              `)
            },
            timeout
          )
        })

        describe('only with headings options', () => {
          it(
            'assigns heading outlines to PDF',
            async () => {
              await pdfInstance({
                output: 'test.pdf',
                pdfOutlines: { pages: false, headings: true },
              }).convertFile(baseFile())

              expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

              const pdf = await PDFDocument.load(
                writeFileSpy.mock.calls[0][1] as Buffer
              )
              const outlines = pdf.catalog.lookup(
                PDFName.of('Outlines'),
                PDFDict
              )

              expect(outlines.lookup(PDFName.of('Type'))).toStrictEqual(
                PDFName.of('Outlines')
              )
              expect(outlines.lookup(PDFName.of('Count'))).toStrictEqual(
                PDFNumber.of(7) // 7 headings
              )

              expect(getOutline(outlines)[1]).toMatchInlineSnapshot(`
                [
                  [
                    "1",
                    [
                      [
                        "2",
                        [
                          [
                            "4",
                            [],
                          ],
                          [
                            "3",
                            [
                              [
                                "5",
                                [],
                              ],
                            ],
                          ],
                        ],
                      ],
                      [
                        "2-2",
                        [
                          [
                            "4-2",
                            [],
                          ],
                        ],
                      ],
                    ],
                  ],
                ]
              `)
            },
            timeout
          )
        })
      })

      describe('with custom timeout set by browser manager', () => {
        it(
          'follows setting timeout',
          async () => {
            await using browserManager = new BrowserManager({ timeout: 1 })

            await expect(
              pdfInstance({
                browserManager,
                output: 'test.pdf',
              }).convertFile(new File(onePath))
            ).rejects.toThrow(TimeoutError)
          },
          timeout
        )
      })

      describe('with Firefox browser', () => {
        it(
          'outputs warning about incompatibility',
          async () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation()

            await using browserManager = new BrowserManager({
              finders: ['firefox'],
              timeout,
            })

            await pdfInstance({
              browserManager,
              output: 'test.pdf',
            }).convertFile(new File(onePath))

            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining(
                'The output may include some incompatible renderings'
              )
            )
            expect(fs.promises.writeFile).toHaveBeenCalled()

            const [lastCall] = writeFileSpy.mock.calls.slice(-1)
            expect(lastCall[0]).toBe('test.pdf')
            expect(lastCall[1]).toBeInstanceOf(Buffer)
          },
          timeout
        )
      })
    })

    describe('when convert type is PPTX', () => {
      const converter = (opts: Partial<ConverterOption> = {}) =>
        instance({ output: 'test.pptx', type: ConvertType.pptx, ...opts })

      const getPptxDocProps = async (buffer: Buffer) => {
        // Require to ignore type definition by casting into any :(
        // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20497
        const zip = await (promisify(yauzlFromBuffer) as any)(buffer, {
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
                  const $ = load(Buffer.concat(readBuffer).toString())
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
          const cvt = converter()
          const imageSpy = jest.spyOn(cvt as any, 'convertFileToImage')

          await cvt.convertFile(new File(onePath))
          expect(writeFileSpy).toHaveBeenCalled()
          expect(writeFileSpy.mock.calls[0][0]).toBe('test.pptx')
          expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

          // It has a different default scale x2
          expect(imageSpy).toHaveBeenLastCalledWith(
            expect.anything(), // Template
            expect.anything(), // File
            expect.objectContaining({ scale: 2 })
          )

          // ZIP PK header for Office Open XML
          const pptx = writeFileSpy.mock.calls[0][1] as Buffer
          expect(pptx.toString('ascii', 0, 2)).toBe('PK')
          expect(pptx.toString('hex', 2, 4)).toBe('0304')

          // Creator meta
          const meta = await getPptxDocProps(pptx)
          expect(meta['dc:creator']).toBe('Created by Marp')
        },
        timeout
      )

      describe('with meta global directives', () => {
        it(
          'assigns meta info thorugh PptxGenJs',
          async () => {
            const cvt = converter({
              imageScale: 1,
              globalDirectives: {
                title: 'Test meta',
                description: 'Test description',
                author: 'author',
              },
            })
            const imageSpy = jest.spyOn(cvt as any, 'convertFileToImage')

            await cvt.convertFile(new File(onePath))
            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const pptx = writeFileSpy.mock.calls[0][1] as Buffer
            const meta = await getPptxDocProps(pptx)

            expect(meta['dc:title']).toBe('Test meta')
            expect(meta['dc:subject']).toBe('Test description')
            expect(meta['dc:creator']).toBe('author')

            // Custom scale
            expect(imageSpy).toHaveBeenLastCalledWith(
              expect.anything(), // Template
              expect.anything(), // File
              expect.objectContaining({ scale: 1 })
            )
          },
          timeout
        )
      })

      describe('with pptxEditable option', () => {
        beforeEach(() => {
          // Don't mock writeFile to use actually saved tmp file for conversion
          writeFileSpy.mockRestore()
        })

        it(
          'converts markdown file into PDF -> PPTX through soffice',
          async () => {
            const cvt = converter({ pptxEditable: true })
            const editablePptxSpy = jest.spyOn(
              cvt as any,
              'convertFileToEditablePPTX'
            )
            const unlink = jest.spyOn(fs.promises, 'unlink')
            const fileSave = jest
              .spyOn(File.prototype, 'save')
              .mockImplementation()
            const fileTmp = jest.spyOn(File.prototype, 'saveTmpFile')
            const warn = jest.spyOn(console, 'warn').mockImplementation()

            await cvt.convertFile(new File(onePath))
            expect(editablePptxSpy).toHaveBeenCalled()
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining(
                'Converting to editable PPTX is experimental feature'
              )
            )
            expect(fileTmp).toHaveBeenCalledWith(
              expect.objectContaining({ extension: '.pdf' })
            )
            expect(unlink).toHaveBeenCalledWith(
              expect.stringContaining(os.tmpdir())
            )
            expect(fileSave).toHaveBeenCalled()

            const savedFile = fileSave.mock.instances[0] as unknown as File
            expect(savedFile).toBeInstanceOf(File)
            expect(savedFile.path).toBe('test.pptx')

            // ZIP PK header for Office Open XML
            expect(savedFile.buffer?.toString('ascii', 0, 2)).toBe('PK')
            expect(savedFile.buffer?.toString('hex', 2, 4)).toBe('0304')
          },
          timeoutLarge
        )

        it(
          'throws an error when soffice is not found',
          async () => {
            const err = new CLIError('Error', CLIErrorCode.NOT_FOUND_SOFFICE)

            jest.spyOn(console, 'warn').mockImplementation()
            jest.spyOn(sofficeFinder, 'findSOffice').mockRejectedValue(err)

            const cvt = converter({ pptxEditable: true })
            await expect(() =>
              cvt.convertFile(new File(onePath))
            ).rejects.toThrow(err)
          },
          timeout
        )

        it(
          'throws an error when soffice is spawned but does not generate a converted file',
          async () => {
            jest.spyOn(console, 'warn').mockImplementation()
            jest.spyOn(SOffice.prototype, 'spawn').mockResolvedValue()

            const cvt = converter({ pptxEditable: true })
            await expect(() =>
              cvt.convertFile(new File(onePath))
            ).rejects.toThrow('LibreOffice could not convert PPTX internally.')
          },
          timeout
        )
      })
    })

    describe('when convert type is PNG', () => {
      it(
        'converts markdown file into PNG',
        async () => {
          await instance({
            output: 'a.png',
            type: ConvertType.png,
          }).convertFile(new File(onePath))

          expect(fs.promises.writeFile).toHaveBeenCalled()
          expect(writeFileSpy.mock.calls[0][0]).toBe('a.png')
          expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

          const png = writeFileSpy.mock.calls[0][1] as Buffer
          expect(png.toString('ascii', 1, 4)).toBe('PNG')

          const { width, height } = imageSize(png)
          expect(width).toBe(1280)
          expect(height).toBe(720)
        },
        timeout
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

            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const png = writeFileSpy.mock.calls[0][1] as Buffer
            const { width, height } = imageSize(png)

            expect(width).toBe(960)
            expect(height).toBe(720)
          },
          timeout
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

            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const png = writeFileSpy.mock.calls[0][1] as Buffer
            const { width, height } = imageSize(png)

            expect(width).toBe(640)
            expect(height).toBe(360)
          },
          timeout
        )

        describe('with Firefox browser', () => {
          it(
            'applies the scale factor to PNG',
            async () => {
              await using browserManager = new BrowserManager({
                finders: ['firefox'],
                timeout,
              })

              await instance({
                browserManager,
                output: 'a.png',
                type: ConvertType.png,
                imageScale: 0.5,
              }).convertFile(new File(onePath))

              const [lastCall] = writeFileSpy.mock.calls.slice(-1)
              expect(lastCall[1]).toBeInstanceOf(Buffer)

              const png = lastCall[1] as Buffer
              const { width, height } = imageSize(png)

              expect(width).toBe(640)
              expect(height).toBe(360)
            },
            timeout
          )
        })
      })
    })

    describe('when convert type is JPEG', () => {
      it(
        'converts markdown file into JPEG',
        async () => {
          await instance({
            output: 'b.jpg',
            type: ConvertType.jpeg,
          }).convertFile(new File(onePath))

          expect(fs.promises.writeFile).toHaveBeenCalled()
          expect(writeFileSpy.mock.calls[0][0]).toBe('b.jpg')
          expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

          const jpeg = writeFileSpy.mock.calls[0][1] as Buffer
          expect(jpeg[0]).toBe(0xff)
          expect(jpeg[1]).toBe(0xd8)

          const { width, height } = imageSize(jpeg)
          expect(width).toBe(1280)
          expect(height).toBe(720)
        },
        timeout
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

            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const jpeg = writeFileSpy.mock.calls[0][1] as Buffer
            const { width, height } = imageSize(jpeg)

            expect(width).toBe(960)
            expect(height).toBe(720)
          },
          timeout
        )
      })

      describe('with imageScale option', () => {
        it(
          'applies the scale factor to JPEG',
          async () => {
            await instance({
              output: 'b.jpg',
              type: ConvertType.jpeg,
              imageScale: 0.25,
            }).convertFile(new File(onePath))

            expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

            const jpeg = writeFileSpy.mock.calls[0][1] as Buffer
            const { width, height } = imageSize(jpeg)

            expect(width).toBe(320)
            expect(height).toBe(180)
          },
          timeoutLarge
        )
      })

      describe('with WebDriver BiDi protocol', () => {
        it(
          'applies the scale factor to JPEG',
          async () => {
            await using browserManager = new BrowserManager({
              finders: ['chrome', 'edge'],
              protocol: 'webDriverBiDi',
              timeout: timeoutLarge,
            })

            await instance({
              browserManager,
              output: 'b.jpg',
              type: ConvertType.jpeg,
              imageScale: 0.25,
            }).convertFile(new File(onePath))

            const [lastCall] = writeFileSpy.mock.calls.slice(-1)
            expect(lastCall[1]).toBeInstanceOf(Buffer)

            const jpeg = lastCall[1] as Buffer
            const { width, height } = imageSize(jpeg)

            expect(width).toBe(320)
            expect(height).toBe(180)

            // Check JPEG quality is working
            writeFileSpy.mockClear()

            await instance({
              browserManager,
              output: 'b.jpg',
              type: ConvertType.jpeg,
              imageScale: 0.25,
              jpegQuality: 1,
            }).convertFile(new File(onePath))

            const [secondCall] = writeFileSpy.mock.calls.slice(-1)
            expect(secondCall[1]).toBeInstanceOf(Buffer)
            expect((secondCall[1] as Buffer).length).toBeLessThan(jpeg.length)
          },
          timeoutLarge
        )
      })

      describe('with Firefox browser', () => {
        it(
          'applies the scale factor to JPEG',
          async () => {
            await using browserManager = new BrowserManager({
              finders: ['firefox'],
              timeout: timeoutLarge,
            })

            await instance({
              browserManager,
              output: 'b.jpg',
              type: ConvertType.jpeg,
              imageScale: 0.25,
            }).convertFile(new File(onePath))

            const [lastCall] = writeFileSpy.mock.calls.slice(-1)
            expect(lastCall[1]).toBeInstanceOf(Buffer)

            const jpeg = lastCall[1] as Buffer
            const { width, height } = imageSize(jpeg)

            expect(width).toBe(320)
            expect(height).toBe(180)

            // Check JPEG quality is working
            writeFileSpy.mockClear()

            await instance({
              browserManager,
              output: 'b.jpg',
              type: ConvertType.jpeg,
              imageScale: 0.25,
              jpegQuality: 1,
            }).convertFile(new File(onePath))

            const [secondCall] = writeFileSpy.mock.calls.slice(-1)
            expect(secondCall[1]).toBeInstanceOf(Buffer)
            expect((secondCall[1] as Buffer).length).toBeLessThan(jpeg.length)
          },
          timeoutLarge
        )
      })
    })

    describe('when pages option is true', () => {
      it(
        'converts markdown file into multiple PNG files',
        async () => {
          const converter = instance({
            output: 'c.png',
            pages: true,
            type: ConvertType.png,
          })
          await converter.convertFile(new File(onePath)) // 2 pages

          expect(fs.promises.writeFile).toHaveBeenCalledTimes(2)
          expect(writeFileSpy.mock.calls[0][0]).toBe('c.001.png')
          expect(writeFileSpy.mock.calls[1][0]).toBe('c.002.png')
        },
        timeout
      )
    })

    describe('when convert type is notes', () => {
      it('converts markdown file to notes text and save to specified path when output is defined', async () => {
        const notesInstance = (opts: Partial<ConverterOption> = {}) =>
          instance({ ...opts, type: ConvertType.notes })

        const output = './specified.txt'
        const ret = await notesInstance({ output }).convertFile(
          new File(threePath)
        )

        expect(fs.promises.writeFile).toHaveBeenCalled()
        expect(writeFileSpy.mock.calls[0][0]).toBe('./specified.txt')
        expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

        const notes = writeFileSpy.mock.calls[0][1] as Buffer
        expect(notes.toString()).toBe('presenter note')

        expect(ret.newFile?.path).toBe('./specified.txt')
        expect(ret.newFile?.buffer).toBe(notes)
      })

      it('converts markdown file to empty text and save to specified path when output is defined but no notes exist', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation()

        const notesInstance = (opts: Partial<ConverterOption> = {}) =>
          instance({ ...opts, type: ConvertType.notes })

        const output = './specified.txt'
        const ret = await notesInstance({ output }).convertFile(
          new File(onePath)
        )

        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('contains no notes')
        )
        expect(fs.promises.writeFile).toHaveBeenCalled()
        expect(writeFileSpy.mock.calls[0][0]).toBe('./specified.txt')
        expect(writeFileSpy.mock.calls[0][1]).toBeInstanceOf(Buffer)

        const notes = writeFileSpy.mock.calls[0][1] as Buffer
        expect(notes.toString()).toBe('')
        expect(ret.newFile?.path).toBe('./specified.txt')
        expect(ret.newFile?.buffer).toBe(notes)
      })
    })
  })

  describe('#convertFiles', () => {
    const originalConvertFile = Converter.prototype.convertFile
    const convertFileCallTimes: number[] = []

    let convertFileSpy: jest.SpiedFunction<typeof originalConvertFile>

    beforeEach(() => {
      convertFileCallTimes.splice(0, convertFileCallTimes.length)

      convertFileSpy = jest
        .spyOn(Converter.prototype, 'convertFile')
        .mockImplementation(function (this: Converter, ...args) {
          convertFileCallTimes.push(Date.now())
          return originalConvertFile.apply(this, args)
        })
    })

    describe('with multiple files', () => {
      it(
        'converts passed files',
        async () => {
          await instance({ type: ConvertType.pdf }).convertFiles([
            new File(onePath),
            new File(twoPath),
          ])
          expect(fs.promises.writeFile).toHaveBeenCalledTimes(2)

          // Check sequential conversion
          expect(convertFileSpy).toHaveBeenCalledTimes(2)
          expect(convertFileCallTimes).toHaveLength(2)
          expect(
            Math.abs(convertFileCallTimes[1] - convertFileCallTimes[0])
          ).toBeGreaterThanOrEqual(300)

          const files = writeFileSpy.mock.calls.map(([fn]) => fn)
          expect(files).toHaveLength(2)
          expect(files).toStrictEqual(
            expect.arrayContaining([
              `${onePath.slice(0, -3)}.pdf`,
              `${twoPath.slice(0, -6)}.pdf`,
            ])
          )
        },
        timeout
      )

      it('throws CLIError when output is defined', () =>
        expect(
          instance({ output: 'test' }).convertFiles([
            new File(onePath),
            new File(twoPath),
          ])
        ).rejects.toBeInstanceOf(CLIError))

      it('converts passed files when output is stdout', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()
        const files = [new File(onePath), new File(twoPath)]

        await instance({ output: '-' }).convertFiles(files, {
          onConverted: (result) => expect(files).toContain(result.file),
        })

        expect(fs.promises.writeFile).not.toHaveBeenCalled()
        expect(stdout).toHaveBeenCalledTimes(2)
      })

      describe('with parallel option', () => {
        it(
          'converts passed files in parallel with the number of specified workers',
          async () => {
            await instance({ parallel: 2, type: ConvertType.pdf }).convertFiles(
              [new File(onePath), new File(twoPath)]
            )

            // Check parallelism
            expect(convertFileSpy).toHaveBeenCalledTimes(2)
            expect(convertFileCallTimes).toHaveLength(2)
            expect(
              Math.abs(convertFileCallTimes[1] - convertFileCallTimes[0])
            ).toBeLessThan(300)

            const files = writeFileSpy.mock.calls.map(([fn]) => fn)
            expect(files).toHaveLength(2)
            expect(files).toStrictEqual(
              expect.arrayContaining([
                `${onePath.slice(0, -3)}.pdf`,
                `${twoPath.slice(0, -6)}.pdf`,
              ])
            )
          },
          timeout
        )
      })
    })
  })
})

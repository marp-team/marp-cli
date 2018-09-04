import Marp from '@marp-team/marp-core'
import { MarpitOptions } from '@marp-team/marpit'
import fs from 'fs'
import os from 'os'
import path from 'path'
import context from './_helpers/context'
import { useSpy } from './_helpers/spy'
import { Converter, ConvertType } from '../src/converter'
import { File, FileType } from '../src/file'
import { bare as bareTpl } from '../src/templates'
import { CLIError } from '../src/error'

describe('Converter', () => {
  const onePath = path.resolve(__dirname, '_files/1.md')
  const twoPath = path.resolve(__dirname, '_files/2.mdown')
  const threePath = path.resolve(__dirname, '_files/3.markdown')

  const instance = (opts = {}) =>
    new Converter({
      allowLocalFiles: false,
      lang: 'en',
      engine: Marp,
      options: {},
      template: 'bare',
      type: ConvertType.html,
      ...opts,
    })

  describe('#constructor', () => {
    it('assigns initial options to options member', () => {
      const options = {
        allowLocalFiles: true,
        lang: 'fr',
        engine: Marp,
        options: <MarpitOptions>{ html: true },
        template: 'test-template',
        type: ConvertType.html,
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

    it('returns the result of template', async () => {
      const options = { html: true }
      const readyScript = '<b>ready</b>'
      const result = await instance({ options, readyScript }).convert(md)

      expect(result.result).toMatch(/^<!DOCTYPE html>[\s\S]+<\/html>$/)
      expect(result.result).toContain(result.rendered.html)
      expect(result.result).toContain(result.rendered.css)
      expect(result.result).toContain(readyScript)
      expect(result.result).not.toContain('<base')
      expect(result.rendered.css).toContain('@theme default')
    })

    it('throws CLIError when selected engine is not implemented render() method', () => {
      const subject = instance({ engine: function _() {} }).convert(md)
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

    it("overrides theme by converter's theme option", async () => {
      const { rendered } = await instance({ theme: 'gaia' }).convert(md)
      expect(rendered.css).toContain('@theme gaia')
    })

    it("overrides html option by converter's html option", async () => {
      const enabled = (await instance({ html: true }).convert(md)).rendered
      expect(enabled.html).toContain('<i>Hello!</i>')

      const disabled = (await instance({ html: false }).convert(md)).rendered
      expect(disabled.html).toContain('&lt;i&gt;Hello!&lt;/i&gt;')
    })

    context('with PDF convert type', () => {
      const converter = instance({ type: ConvertType.pdf })
      const dummyFile = new File(process.cwd())

      it('adds <base> element with specified base path from passed file', async () => {
        const { result } = await converter.convert(md, dummyFile)
        expect(result).toContain(`<base href="${process.cwd()}">`)
      })
    })
  })

  describe('#convertFile', () => {
    it('rejects Promise when specified file is not found', () => {
      expect(
        instance().convertFile(new File('_NOT_FOUND_MARKDOWN_'))
      ).rejects.toBeTruthy()
    })

    it('converts markdown file and save as html file', async () => {
      const write = jest.spyOn(fs, 'writeFile')

      return useSpy([write], async () => {
        write.mockImplementation((_, __, callback) => callback())

        const output = `${onePath.slice(0, -3)}.html`
        await instance().convertFile(new File(onePath))

        expect(write).toHaveBeenCalledWith(
          output,
          expect.any(Buffer),
          expect.anything()
        )
      })
    })

    it('converts markdown file and save to specified path when output is defined', async () => {
      const write = jest.spyOn(fs, 'writeFile')

      return useSpy([write], async () => {
        write.mockImplementation((_, __, callback) => callback())

        const output = './specified.html'
        await instance({ output }).convertFile(new File(twoPath))

        expect(write).toHaveBeenCalledWith(
          output,
          expect.any(Buffer),
          expect.anything()
        )
      })
    })

    it('converts markdown file but not save when output is stdout', async () => {
      const write = jest.spyOn(fs, 'writeFile')
      const stdout = jest.spyOn(process.stdout, 'write')

      return useSpy([write, stdout], async () => {
        const result = await instance({ output: '-' }).convertFile(
          new File(threePath)
        )

        expect(write).not.toHaveBeenCalled()
        expect(stdout).toHaveBeenCalledTimes(1)
        expect(result.file.path).toBe(threePath)
        expect(result.newFile.type).toBe(FileType.StandardIO)
      })
    })

    context('when convert type is PDF', () => {
      const pdfInstance = (opts = {}) =>
        instance({ ...opts, type: ConvertType.pdf })

      it(
        'converts markdown file into PDF',
        async () => {
          const write = jest.spyOn(fs, 'writeFile')

          return useSpy([write], async () => {
            write.mockImplementation((_, __, callback) => callback())

            const opts = { output: 'test.pdf' }
            const ret = await pdfInstance(opts).convertFile(new File(onePath))
            const pdf: Buffer = write.mock.calls[0][1]

            expect(write).toHaveBeenCalled()
            expect(write.mock.calls[0][0]).toBe('test.pdf')
            expect(pdf.toString('ascii', 0, 5)).toBe('%PDF-')
            expect(ret.newFile.path).toBe('test.pdf')
            expect(ret.newFile.buffer).toBe(pdf)
          })
        },
        10000
      )

      context('with allowLocalFiles option as true', () => {
        it(
          'converts into PDF by using temporally file',
          async () => {
            const file = new File(onePath)

            // @ts-ignore to check cleanup tmpfile
            const fileCleanup = jest.spyOn(File.prototype, 'cleanup')
            const fileSave = jest.spyOn(File.prototype, 'save')
            const fileTmp = jest.spyOn(File.prototype, 'saveTmpFile')

            const warn = jest.spyOn(console, 'warn')

            return useSpy(
              [fileCleanup, fileSave, fileTmp, warn],
              async () => {
                fileSave.mockImplementation()
                warn.mockImplementation()

                await pdfInstance({
                  allowLocalFiles: true,
                  output: '-',
                }).convertFile(file)

                expect(warn).toBeCalledWith(
                  expect.stringContaining(
                    'Insecure local file accessing is enabled'
                  )
                )
                expect(fileTmp).toBeCalledWith('.html')
                expect(fileCleanup).toBeCalledWith(
                  expect.stringContaining(os.tmpdir())
                )
                expect(fileSave).toBeCalled()
              },
              false
            )
          },
          10000
        )
      })
    })
  })

  describe('#convertFiles', () => {
    context('with multiple files', () => {
      it('converts passed files', async () => {
        const write = jest.spyOn(fs, 'writeFile')

        return useSpy([write], async () => {
          write.mockImplementation((_, __, callback) => callback())

          await instance().convertFiles([new File(onePath), new File(twoPath)])
          expect(write).toHaveBeenCalledTimes(2)
          expect(write.mock.calls[0][0]).toBe(`${onePath.slice(0, -3)}.html`)
          expect(write.mock.calls[1][0]).toBe(`${twoPath.slice(0, -6)}.html`)
        })
      })

      it('throws CLIError when output is defined', () =>
        expect(
          instance({ output: 'test' }).convertFiles([
            new File(onePath),
            new File(twoPath),
          ])
        ).rejects.toBeInstanceOf(CLIError))

      it('converts passed files when output is stdout', async () => {
        const write = jest.spyOn(fs, 'writeFile')
        const stdout = jest.spyOn(process.stdout, 'write')

        return useSpy([write, stdout], async () => {
          const files = [new File(onePath), new File(twoPath)]

          await instance({ output: '-' }).convertFiles(files, result =>
            expect(files.includes(result.file)).toBe(true)
          )

          expect(write).not.toHaveBeenCalled()
          expect(stdout).toHaveBeenCalledTimes(2)
        })
      })
    })
  })
})

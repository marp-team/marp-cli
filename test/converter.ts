import Marp from '@marp-team/marp-core'
import { MarpitOptions } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import context from './_helpers/context'
import { useSpy } from './_helpers/spy'
import { Converter } from '../src/converter'
import { bare as bareTpl } from '../src/templates'
import { CLIError } from '../src/error'

describe('Converter', () => {
  const onePath = path.resolve(__dirname, '_files/1.md')
  const twoPath = path.resolve(__dirname, '_files/2.mdown')
  const threePath = path.resolve(__dirname, '_files/3.markdown')

  const instance = (opts = {}) =>
    new Converter({
      engine: Marp,
      options: {},
      template: 'bare',
      ...opts,
    })

  describe('#constructor', () => {
    it('assigns initial options to options member', () => {
      const options = {
        engine: Marp,
        options: { html: true } as MarpitOptions,
        template: 'test-template',
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
    it('returns the result of template', () => {
      const options = { html: true }
      const readyScript = '<b>ready</b>'
      const md = '# <i>Hello!</i>'
      const result = instance({ options, readyScript }).convert(md)

      expect(result.result).toMatch(/^<!DOCTYPE html>[\s\S]+<\/html>$/)
      expect(result.result).toContain(result.rendered.html)
      expect(result.result).toContain(result.rendered.css)
      expect(result.result).toContain(readyScript)
      expect(result.options.readyScript).toBe(readyScript)
      expect(result.rendered.css).toContain('@theme default')
    })

    it('throws CLIError when selected engine is not implemented render() method', () => {
      const subject = () => instance({ engine: function _() {} }).convert('')
      expect(subject).toThrow(CLIError)
    })

    it('throws CLIError when selected template is not found', () => {
      const subject = () => instance({ template: 'not-found' }).convert('')
      expect(subject).toThrow(CLIError)
    })

    it("overrides theme by converter's theme option", () => {
      const { rendered } = instance({ theme: 'gaia' }).convert('')
      expect(rendered.css).toContain('@theme gaia')
    })
  })

  describe('#convertFile', () => {
    it('rejects Promise when specified file is not found', () => {
      expect(
        instance().convertFile('_NOT_FOUND_MARKDOWN_')
      ).rejects.toBeTruthy()
    })

    it('converts markdown file and save as html file', async () => {
      const write = jest.spyOn(fs, 'writeFile')

      return useSpy([write], async () => {
        write.mockImplementation((_, __, callback) => callback())

        const outputPath = `${onePath.slice(0, -3)}.html`
        const result = await instance().convertFile(onePath)

        expect(write).toHaveBeenCalledWith(
          outputPath,
          result.result,
          expect.anything()
        )

        expect(result.path).toBe(onePath)
        expect(result.output).toBe(outputPath)
      })
    })

    it('converts markdown file and save to specified path when output is defined', async () => {
      const write = jest.spyOn(fs, 'writeFile')

      return useSpy([write], async () => {
        write.mockImplementation((_, __, callback) => callback())

        const output = './specified.html'
        const result = await instance({ output }).convertFile(twoPath)

        expect(write).toHaveBeenCalledWith(
          output,
          result.result,
          expect.anything()
        )

        expect(result.path).toBe(twoPath)
        expect(result.output).toBe(output)
      })
    })

    it('converts markdown file but not save when output is stdout', async () => {
      const write = jest.spyOn(fs, 'writeFile')

      return useSpy([write], async () => {
        const result = await instance({ output: '-' }).convertFile(threePath)

        expect(write).not.toHaveBeenCalled()
        expect(result.path).toBe(threePath)
        expect(result.output).toBe('-')
      })
    })
  })

  describe('#convertFiles', () => {
    context('with multiple files', () => {
      it('converts passed files', async () => {
        const write = jest.spyOn(fs, 'writeFile')

        return useSpy([write], async () => {
          write.mockImplementation((_, __, callback) => callback())
          const result = await instance().convertFiles(onePath, twoPath)

          expect(write).toHaveBeenCalledTimes(2)
          expect(result.map(r => r.path)).toStrictEqual([onePath, twoPath])
        })
      })

      it('throws CLIError when output is defined', () =>
        expect(() =>
          instance({ output: 'specified.html' }).convertFiles(onePath, twoPath)
        ).toThrow(CLIError))

      it('converts passed files when output is stdout', async () => {
        const write = jest.spyOn(fs, 'writeFile')

        return useSpy([write], async () => {
          const ins = instance({ output: '-' })
          const result = await ins.convertFiles(onePath, twoPath)

          expect(write).not.toHaveBeenCalled()
          expect(result.map(r => r.path)).toStrictEqual([onePath, twoPath])
        })
      })
    })
  })
})

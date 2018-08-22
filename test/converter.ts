import Marp from '@marp-team/marp-core'
import { Converter } from '../src/converter'
import { bare as bareTpl } from '../src/templates'
import { MarpitOptions } from '@marp-team/marpit'
import { CLIError } from '../src/error'

describe('Converter', () => {
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
})

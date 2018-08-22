import Marp from '@marp-team/marp-core'
import { Converter, ConverterOption } from '../src/converter'
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
})

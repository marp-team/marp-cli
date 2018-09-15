import chalk from 'chalk'
import { error, info, warn } from '../src/cli'

afterEach(() => jest.restoreAllMocks())

describe('CLI helpers', () => {
  describe('#error', () => {
    it('passes message with colored header to console.error', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation()

      error('cli-helper')
      expect(errSpy).toHaveBeenCalledWith(
        chalk`{bgRed.white [ ERROR ]} cli-helper`
      )
    })
  })

  describe('#info', () => {
    it('passes message with colored header to console.warn', () => {
      // Use console.warn to output into stderr
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

      info('cli-helper')
      expect(warnSpy).toHaveBeenCalledWith(
        chalk`{bgCyan.black [  INFO ]} cli-helper`
      )
    })
  })

  describe('#warn', () => {
    it('passes message with colored header to console.warn', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

      warn('cli-helper')
      expect(warnSpy).toHaveBeenCalledWith(
        chalk`{bgYellow.black [  WARN ]} cli-helper`
      )
    })
  })
})

import chalk from 'chalk'
import { error, info, silence, warn } from '../src/cli'

afterEach(() => {
  jest.restoreAllMocks()
  silence(false)
})

describe('CLI helpers', () => {
  let spy: jest.SpyInstance

  describe('#error', () => {
    beforeEach(() => (spy = jest.spyOn(console, 'error').mockImplementation()))

    it('passes message with colored header to console.error', () => {
      error('cli-helper')
      expect(spy).toHaveBeenCalledWith(chalk`{bgRed.white [ ERROR ]} cli-helper`)
    })

    it('calls console.error even if silenced', () => {
      silence(true)
      error('cli-helper')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('#info', () => {
    // Use console.warn to output into stderr
    beforeEach(() => (spy = jest.spyOn(console, 'warn').mockImplementation()))

    it('passes message with colored header to console.warn', () => {
      info('cli-helper')
      expect(spy).toHaveBeenCalledWith(chalk`{bgCyan.black [  INFO ]} cli-helper`)
    })

    it('does not call console.warn when silenced', () => {
      silence(true)
      info('cli-helper')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('#warn', () => {
    beforeEach(() => (spy = jest.spyOn(console, 'warn').mockImplementation()))

    it('passes message with colored header to console.warn', () => {
      warn('cli-helper')
      expect(spy).toHaveBeenCalledWith(chalk`{bgYellow.black [  WARN ]} cli-helper`)
    })

    it('does not call console.warn when silenced', () => {
      silence(true)
      warn('cli-helper')
      expect(spy).not.toHaveBeenCalled()
    })
  })
})

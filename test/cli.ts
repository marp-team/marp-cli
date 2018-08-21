import chalk from 'chalk'
import { error, info, warn } from '../src/cli'
import { useSpy } from './_helpers/spy'

describe('CLI helpers', () => {
  describe('#error', () => {
    it('passes message with colored header to console.error', () => {
      const errorSpy = jest.spyOn(console, 'error')

      useSpy([errorSpy], () => {
        error('cli-helper')
        expect(errorSpy).toHaveBeenCalledWith(
          chalk`{bgRed.white [ ERROR ]} cli-helper`
        )
      })
    })
  })

  describe('#info', () => {
    it('passes message with colored header to console.info', () => {
      const infoSpy = jest.spyOn(console, 'info')

      useSpy([infoSpy], () => {
        info('cli-helper')
        expect(infoSpy).toHaveBeenCalledWith(
          chalk`{bgCyan.black [  INFO ]} cli-helper`
        )
      })
    })
  })

  describe('#warn', () => {
    it('passes message with colored header to console.warn', () => {
      const warnSpy = jest.spyOn(console, 'warn')

      useSpy([warnSpy], () => {
        warn('cli-helper')
        expect(warnSpy).toHaveBeenCalledWith(
          chalk`{bgYellow.black [  WARN ]} cli-helper`
        )
      })
    })
  })
})

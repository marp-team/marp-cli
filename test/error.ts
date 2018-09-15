import { CLIError, error } from '../src/error'

describe('Error helper', () => {
  describe('#error', () => {
    it('throws CLIError', () => {
      expect(() => error('EXCEPTION')).toThrowError(
        new CLIError('EXCEPTION', 1)
      )
    })

    context('when passing error code as second argument', () => {
      it('throws CLIError with specified errorCode', () => {
        expect(() => error('with code', 128)).toThrowError(
          new CLIError('with code', 128)
        )
      })
    })
  })

  describe('#toString', () => {
    it('returns message defined in constructor', () => {
      const err = new CLIError('Hello, CLI error!')
      expect(err.toString()).toBe('Hello, CLI error!')
    })
  })
})

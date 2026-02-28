import { CLIError, error, isError } from '../src/error'

describe('Error helper', () => {
  describe('#error', () => {
    it('throws CLIError', () => {
      expect(() => error('EXCEPTION')).toThrow(new CLIError('EXCEPTION', 1))
    })

    describe('when passing error code as second argument', () => {
      it('throws CLIError with specified errorCode', () => {
        expect(() => error('with code', 1)).toThrow(
          new CLIError('with code', 1)
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

  describe('#isError', () => {
    it('returns true for Error instance', () => {
      expect(isError(new Error('test'))).toBe(true)
    })

    it('returns true for custom error with non-standard toStringTag', () => {
      class ProtocolLikeError extends Error {
        readonly [Symbol.toStringTag] = 'ProtocolError'
      }

      expect(isError(new ProtocolLikeError('test'))).toBe(true)
    })

    it('returns false for non-error values', () => {
      expect(isError('error')).toBe(false)
      expect(isError({ message: 'error' })).toBe(false)
      expect(isError(null)).toBe(false)
    })
  })
})

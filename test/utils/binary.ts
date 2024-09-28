import { isStandaloneBinary } from '../../src/utils/binary'

describe('isStandaloneBinary()', () => {
  const pkg = process['pkg']

  beforeEach(() => {
    jest.resetModules()

    if (pkg === undefined) {
      delete process['pkg']
    } else {
      process['pkg'] = pkg
    }
  })

  it('returns false if process.pkg is not defined', () => {
    delete process['pkg']
    expect(isStandaloneBinary()).toBe(false)
  })

  it('returns true if process.pkg is defined', () => {
    process['pkg'] = undefined // it's ok if only has a key
    expect(isStandaloneBinary()).toBe(true)
  })
})

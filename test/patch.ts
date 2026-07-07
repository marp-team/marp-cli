import { patch, patcher } from '../src/patch'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('patch()', () => {
  it('calls patch methods', () => {
    jest.spyOn(patcher, 'enableCompileCache')

    patch()
    expect(patcher.enableCompileCache).toHaveBeenCalled()
  })
})

describe('enableCompileCache()', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  const enableCompileCache = async () =>
    (await import('../src/patch')).patcher.enableCompileCache()

  it('calls module.enableCompileCache()', async () => {
    const mock = jest.fn()
    jest.doMock('node:module', () => ({ enableCompileCache: mock }))

    await enableCompileCache()
    expect(mock).toHaveBeenCalled()
  })

  it('ignores error raised from module.enableCompileCache()', async () => {
    jest.doMock('node:module', () => ({
      enableCompileCache: jest.fn(() => {
        throw new Error('test')
      }),
    }))

    expect(enableCompileCache).not.toThrow()
  })

  it('does nothing if module.enableCompileCache is not defined (for older versions of Node.js)', async () => {
    jest.doMock('node:module', () => ({}))

    expect(enableCompileCache).not.toThrow()
  })
})

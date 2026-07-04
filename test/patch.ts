import { patch, patcher } from '../src/patch'
import * as binary from '../src/utils/binary'

const mockIntlSegmenterPolyfilled = jest.fn()

jest.mock('@formatjs/intl-segmenter/polyfill-force.js', () =>
  mockIntlSegmenterPolyfilled()
)

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('patch()', () => {
  it('calls patch methods', () => {
    jest.spyOn(patcher, 'enableCompileCache')
    jest.spyOn(patcher, 'patchSegmenter')

    patch()
    expect(patcher.enableCompileCache).toHaveBeenCalled()
    expect(patcher.patchSegmenter).toHaveBeenCalled()
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

describe('patchSegmenter()', () => {
  const originalVariables = process.config.variables

  beforeEach(() => {
    Object.defineProperty(process.config, 'variables', {
      value: Object.assign(Object.create(null), originalVariables),
    })
  })

  afterEach(() => {
    Object.defineProperty(process.config, 'variables', {
      value: originalVariables,
    })
  })

  it('does not polyfill Intl.Segmenter if not in a standalone binary', () => {
    jest.spyOn(binary, 'isStandaloneBinary').mockReturnValue(false)

    patcher.patchSegmenter()
    expect(mockIntlSegmenterPolyfilled).not.toHaveBeenCalled()
  })

  it('does not polyfill Intl.Segmenter if in a standalone binary but not using small ICU', () => {
    jest.spyOn(binary, 'isStandaloneBinary').mockReturnValue(true)
    process.config.variables['icu_small'] = false

    patcher.patchSegmenter()
    expect(mockIntlSegmenterPolyfilled).not.toHaveBeenCalled()
  })

  it('does polyfill Intl.Segmenter if in a standalone binary but not using small ICU', () => {
    jest.spyOn(binary, 'isStandaloneBinary').mockReturnValue(true)
    process.config.variables['icu_small'] = true

    patcher.patchSegmenter()
    expect(mockIntlSegmenterPolyfilled).toHaveBeenCalled()
  })
})

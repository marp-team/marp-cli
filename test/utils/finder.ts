import path from 'node:path'
import { getPlatform, isSnapBrowser } from '../../src/utils/finder'
import * as wsl from '../../src/utils/wsl'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

const executableMock = (name: string) =>
  path.join(__dirname, '_executable_mocks', name)

describe('#getPlatform', () => {
  it('returns current platform in non WSL environment', async () => {
    jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)
    expect(await getPlatform()).toBe(process.platform)
  })

  it('returns "wsl1" in WSL 1 environment', async () => {
    jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)
    expect(await getPlatform()).toBe('wsl1')
  })

  it('returns current platform in WSL 2 environment', async () => {
    jest.spyOn(wsl, 'isWSL').mockResolvedValue(2)
    expect(await getPlatform()).toBe(process.platform)
  })
})

describe('#isSnapBrowser', () => {
  const { platform } = process

  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: platform })
  })

  describe('with Linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
    })

    it('returns true if the specified path was starting with /snap/', async () => {
      expect(await isSnapBrowser('/snap/bin/__dummy__')).toBe(true)
      expect(await isSnapBrowser('/usr/local/bin/__dummy__')).toBe(false)
    })

    it('returns false if the specified path is not shebang', async () => {
      expect(await isSnapBrowser(executableMock('empty'))).toBe(false)
    })

    it('returns false if the specified path is shebang but not referenced snap', async () => {
      expect(await isSnapBrowser(executableMock('shebang-chromium'))).toBe(
        false
      )
    })

    it('returns true if the specified path is shebang and referenced snap', async () => {
      expect(
        await isSnapBrowser(executableMock('shebang-snapd-chromium'))
      ).toBe(true)
    })
  })

  describe('with other platforms', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
    })

    it('returns false even if the specified path was starting with /snap/', async () => {
      expect(await isSnapBrowser('/snap/bin/__dummy__')).toBe(false)
      expect(await isSnapBrowser('/usr/local/bin/__dummy__')).toBe(false)
    })

    it('returns false even if the specified path is shebang and referenced snap', async () => {
      expect(
        await isSnapBrowser(executableMock('shebang-snapd-chromium'))
      ).toBe(false)
    })
  })
})

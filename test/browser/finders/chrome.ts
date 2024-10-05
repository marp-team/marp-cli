import path from 'node:path'
import * as chromeFinderModule from 'chrome-launcher/dist/chrome-finder'
import { ChromeBrowser } from '../../../src/browser/browsers/chrome'
import { ChromeCdpBrowser } from '../../../src/browser/browsers/chrome-cdp'
import { chromeFinder } from '../../../src/browser/finders/chrome'
import * as utils from '../../../src/browser/finders/utils'
import { CLIError } from '../../../src/error'
import * as wsl from '../../../src/utils/wsl'

jest.mock('chrome-launcher/dist/chrome-finder')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

const itExceptWin = process.platform === 'win32' ? it.skip : it

const executableMock = (name: string) =>
  path.join(__dirname, `../../utils/_executable_mocks`, name)

describe('Chrome finder', () => {
  describe('with preferred path', () => {
    it('returns the preferred path as chrome', async () => {
      const chrome = await chromeFinder({
        preferredPath: '/test/preferred/chrome',
      })

      expect(chrome).toStrictEqual({
        path: '/test/preferred/chrome',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })
  })

  describe('with CHROME_PATH environment variable', () => {
    const originalEnv = { ...process.env }
    const regularResolution = new Error('Starting regular resolution')

    beforeEach(() => {
      jest.resetModules()
      jest.spyOn(utils, 'getPlatform').mockRejectedValue(regularResolution)
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('return the path for executable specified in CHROME_PATH', async () => {
      process.env.CHROME_PATH = executableMock('empty')

      expect(await chromeFinder({})).toStrictEqual({
        path: process.env.CHROME_PATH,
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })

    itExceptWin(
      'processes regular resolution if CHROME_PATH is not executable',
      async () => {
        process.env.CHROME_PATH = executableMock('non-executable')

        await expect(chromeFinder({})).rejects.toThrow(regularResolution)
      }
    )

    it('processes regular resolution if CHROME_PATH is not found', async () => {
      process.env.CHROME_PATH = executableMock('not-found')

      await expect(chromeFinder({})).rejects.toThrow(regularResolution)
    })

    it('prefers the preferred path over CHROME_PATH', async () => {
      process.env.CHROME_PATH = executableMock('empty')

      expect(
        await chromeFinder({ preferredPath: '/test/preferred/chrome' })
      ).toStrictEqual({
        path: '/test/preferred/chrome',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })
  })

  describe('with Linux', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('linux')
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)

      jest
        .spyOn(chromeFinderModule, 'linux')
        .mockReturnValue(['/test/chrome', '/test/chromium'])

      jest
        .spyOn(chromeFinderModule, 'wsl')
        .mockReturnValue(['/mnt/c/test/chrome.exe', '/mnt/c/test/chromium.exe'])
    })

    it('calls linux() in chrome-finder module and returns the first installation path', async () => {
      const chrome = await chromeFinder({})

      expect(chrome).toStrictEqual({
        path: '/test/chrome',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(chromeFinderModule.linux).toHaveBeenCalled()
    })

    it('throws error if linux() was returned empty array', async () => {
      jest.spyOn(chromeFinderModule, 'linux').mockReturnValue([])

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(chromeFinderModule.linux).toHaveBeenCalled()
    })

    it('fallbacks to WSL resolution if in WSL 2 with mirrored network mode', async () => {
      jest.spyOn(wsl, 'getWSL2NetworkingMode').mockResolvedValue('mirrored')
      jest.spyOn(chromeFinderModule, 'linux').mockImplementation(() => {
        throw new Error('Test error')
      })

      const chrome = await chromeFinder({})

      expect(chrome).toStrictEqual({
        path: '/mnt/c/test/chrome.exe',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(chromeFinderModule.linux).toHaveBeenCalled()
      expect(chromeFinderModule.wsl).toHaveBeenCalled()
    })

    it('throws error if in WSL 2 with NAT mode', async () => {
      jest.spyOn(wsl, 'getWSL2NetworkingMode').mockResolvedValue('nat')
      jest.spyOn(chromeFinderModule, 'linux').mockImplementation(() => {
        throw new Error('Test error')
      })

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(chromeFinderModule.linux).toHaveBeenCalled()
      expect(chromeFinderModule.wsl).not.toHaveBeenCalled()
    })
  })

  describe('with macOS', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('darwin')
      jest
        .spyOn(chromeFinderModule, 'darwinFast')
        .mockReturnValue(
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        )
    })

    it('calls darwinFast() in chrome-finder module and returns the installation path', async () => {
      const chrome = await chromeFinder({})

      expect(chrome).toStrictEqual({
        path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(chromeFinderModule.darwinFast).toHaveBeenCalled()
    })

    it('throws error if darwinFast() was returned undefined', async () => {
      jest.spyOn(chromeFinderModule, 'darwinFast').mockReturnValue(undefined)

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(chromeFinderModule.darwinFast).toHaveBeenCalled()
    })
  })

  describe('with Windows', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('win32')
      jest
        .spyOn(chromeFinderModule, 'win32')
        .mockReturnValue([
          'C:\\Program Files\\Google Chrome\\chrome.exe',
          'C:\\Program Files\\Chromium\\chromium.exe',
        ])
    })

    it('calls win32() in chrome-finder module and returns the first installation path', async () => {
      const chrome = await chromeFinder({})

      expect(chrome).toStrictEqual({
        path: 'C:\\Program Files\\Google Chrome\\chrome.exe',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(chromeFinderModule.win32).toHaveBeenCalled()
    })

    it('throws error if win32() was returned empty array', async () => {
      jest.spyOn(chromeFinderModule, 'win32').mockReturnValue([])

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(chromeFinderModule.win32).toHaveBeenCalled()
    })
  })

  describe('with WSL1', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('wsl1')
      jest
        .spyOn(chromeFinderModule, 'wsl')
        .mockReturnValue([
          '/mnt/c/Program Files/Google Chrome/chrome.exe',
          '/mnt/c/Program Files/Chromium/chromium.exe',
        ])
    })

    it('calls wsl() in chrome-finder module and returns the first installation path', async () => {
      const chrome = await chromeFinder({})

      expect(chrome).toStrictEqual({
        path: '/mnt/c/Program Files/Google Chrome/chrome.exe',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(chromeFinderModule.wsl).toHaveBeenCalled()
    })

    it('throws error if wsl() was returned empty array', async () => {
      jest.spyOn(chromeFinderModule, 'wsl').mockReturnValue([])

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(chromeFinderModule.wsl).toHaveBeenCalled()
    })
  })

  describe('with FreeBSD', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('freebsd')
    })

    it('finds possible binaries from PATH by using which command, and return resolved path', async () => {
      jest.spyOn(utils, 'which').mockImplementation(async (command) => {
        if (command === 'chrome') return executableMock('empty')
        return undefined
      })

      const chrome = await chromeFinder({})

      expect(chrome).toStrictEqual({
        path: executableMock('empty'),
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(utils.which).toHaveBeenCalledWith('chrome')
    })

    it('throws error if the path was not resolved', async () => {
      jest.spyOn(utils, 'which').mockResolvedValue(undefined)

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(utils.which).toHaveBeenCalled()
    })

    it('throws error if the which command has rejected by error', async () => {
      jest.spyOn(utils, 'which').mockRejectedValue(new Error('Test error'))

      await expect(chromeFinder({})).rejects.toThrow(CLIError)
      expect(utils.which).toHaveBeenCalled()
    })
  })
})

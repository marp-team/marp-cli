import path from 'node:path'
import * as chromeFinderModule from 'chrome-launcher/dist/chrome-finder'
import { ChromeBrowser } from '../../../src/browser/browsers/chrome'
import { ChromeCdpBrowser } from '../../../src/browser/browsers/chrome-cdp'
import { chromeFinder } from '../../../src/browser/finders/chrome'
import * as utils from '../../../src/browser/finders/utils'
import { CLIError } from '../../../src/error'

jest.mock('chrome-launcher/dist/chrome-finder')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

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

  describe('with Linux', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('linux')
      jest
        .spyOn(chromeFinderModule, 'linux')
        .mockReturnValue(['/test/chrome', '/test/chromium'])
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

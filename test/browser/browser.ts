import * as puppeteer from 'puppeteer-core'
import { Browser } from '../../src/browser/browser'
import { FirefoxBrowser } from '../../src/browser/browsers/firefox'
import * as wsl from '../../src/utils/wsl'

jest.mock('puppeteer-core')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('Browser class', () => {
  describe('#launch', () => {
    const mockedBrowser = { once: jest.fn() }

    beforeEach(() => {
      jest.spyOn(puppeteer as any, 'launch').mockResolvedValue(mockedBrowser)
    })

    it('calls #launch in puppeteer-core with caching', async () => {
      const browser = new FirefoxBrowser({ path: '/path/to/firefox' })

      expect(await browser.launch()).toBe(mockedBrowser)
      expect(await browser.launch()).toBe(mockedBrowser)
      expect(puppeteer.launch).toHaveBeenCalledTimes(1)
    })
  })

  describe('[Symbol.asyncDisposable()]', () => {
    it('calls #close when disposed', async () => {
      const closeSpy = jest.spyOn(Browser.prototype, 'close')
      {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        await using _browser = new FirefoxBrowser({ path: '/path/to/firefox' })
      }
      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe('#browserInWSLHost', () => {
    it('always returns false if the current environment is not WSL', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)

      expect(
        await new FirefoxBrowser({
          path: '/mnt/c/Program Files/Firefox/firefox.exe',
        }).browserInWSLHost()
      ).toBe(false)
    })

    it('returns true if the current environment is WSL and the browser path is located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      expect(
        await new FirefoxBrowser({
          path: '/mnt/c/Program Files/Firefox/firefox.exe',
        }).browserInWSLHost()
      ).toBe(true)
    })

    it('returns false if the current environment is WSL and the browser path is not located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      expect(
        await new FirefoxBrowser({
          path: '/usr/bin/firefox',
        }).browserInWSLHost()
      ).toBe(false)
    })

    it('returns true if the current environment is WSL, the browser path is located in the guest OS, but the spawned browser has located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      const browser = new FirefoxBrowser({
        path: '/usr/bin/firefox-host', // Assuming this is an alias to /mnt/c/Program Files/Firefox/firefox.exe
      })

      const browserMock = {
        once: jest.fn(),
        process: jest.fn(() => ({
          spawnfile: '/mnt/c/Program Files/Firefox/firefox.exe',
        })),
      }

      jest
        .spyOn(browser as any, 'launchPuppeteer')
        .mockResolvedValue(browserMock)

      // If not yet the browser is spawned, it is still false
      expect(await browser.browserInWSLHost()).toBe(false)

      // After the browser is spawned, it should be true
      expect(await browser.launch()).toBe(browserMock)
      expect(await browser.browserInWSLHost()).toBe(true)

      // If close the browser, it should be false again
      await browser.close()
      expect(await browser.browserInWSLHost()).toBe(false)
    })
  })
})

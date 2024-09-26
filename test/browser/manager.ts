import { ChromeBrowser } from '../../src/browser/browsers/chrome'
import { ChromeCdpBrowser } from '../../src/browser/browsers/chrome-cdp'
import { FirefoxBrowser } from '../../src/browser/browsers/firefox'
import * as browserFinder from '../../src/browser/finder'
import { BrowserManager } from '../../src/browser/manager'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('Browser manager', () => {
  describe('constructor', () => {
    it('creates a new instance with specified options', () => {
      const manager: any = new BrowserManager({
        finders: ['chrome', 'firefox'],
        path: '/dummy/path',
        protocol: 'webDriverBiDi',
        timeout: 12345,
      })

      expect(manager).toBeInstanceOf(BrowserManager)
      expect(manager._finders).toStrictEqual(['chrome', 'firefox'])
      expect(manager._finderPreferredPath).toBe('/dummy/path')
      expect(manager._preferredProtocol).toBe('webDriverBiDi')
      expect(manager.timeout).toBe(12345)
    })
  })

  describe('#browserForConversion', () => {
    it('returns suited browser class for conversion', async () => {
      jest.spyOn(browserFinder, 'findBrowser').mockResolvedValue({
        path: '/dummy/path/resolved',
        acceptedBrowsers: [ChromeCdpBrowser, ChromeBrowser],
      })

      const manager = new BrowserManager({
        finders: ['chrome', 'firefox'],
        path: '/dummy/path',
        protocol: 'webDriverBiDi',
      })

      expect(await manager.browserForConversion()).toBeInstanceOf(ChromeBrowser)
      expect(browserFinder.findBrowser).toHaveBeenCalledWith(
        ['chrome', 'firefox'],
        { preferredPath: '/dummy/path' }
      )

      // Check whether the found result will be cached
      await manager.browserForConversion()
      expect(browserFinder.findBrowser).toHaveBeenCalledTimes(1)
    })

    it('throws an error if no suited browser is found', async () => {
      jest
        .spyOn(browserFinder, 'findBrowser')
        .mockResolvedValue({ path: '/dev/null', acceptedBrowsers: [] })

      await expect(new BrowserManager().browserForConversion()).rejects.toThrow(
        'No browser found for conversion'
      )
    })

    it('uses first browser if the preferred protocol did not match', async () => {
      jest.spyOn(browserFinder, 'findBrowser').mockResolvedValue({
        path: '/dummy/path/resolved',
        acceptedBrowsers: [FirefoxBrowser],
      })

      const manager = new BrowserManager({
        finders: ['firefox'],
        protocol: 'cdp',
      })

      expect(await manager.browserForConversion()).toBeInstanceOf(
        FirefoxBrowser
      )
      expect(browserFinder.findBrowser).toHaveBeenCalledWith(['firefox'], {
        preferredPath: undefined,
      })
    })
  })

  describe('#browserForPreview', () => {
    it('returns suited browser class for preview', async () => {
      jest.spyOn(browserFinder, 'findBrowser').mockResolvedValue({
        path: '/dummy/path/resolved',
        acceptedBrowsers: [ChromeCdpBrowser, ChromeBrowser],
      })

      const manager = new BrowserManager({
        finders: ['chrome', 'firefox'],
        path: '/dummy/path',
        protocol: 'webDriverBiDi',
      })

      // Preview window is depending on CDP protocol, so it should return ChromeCdpBrowser
      expect(await manager.browserForPreview()).toBeInstanceOf(ChromeCdpBrowser)
      expect(browserFinder.findBrowser).toHaveBeenCalledWith(
        ['chrome', 'firefox'],
        { preferredPath: '/dummy/path' }
      )

      // Check whether the found result will be cached
      await manager.browserForPreview()
      expect(browserFinder.findBrowser).toHaveBeenCalledTimes(1)
    })

    it('throws an error if no suited browser is found', async () => {
      jest.spyOn(browserFinder, 'findBrowser').mockResolvedValue({
        path: '/dummy/path/resolved',
        acceptedBrowsers: [FirefoxBrowser],
      })

      await expect(new BrowserManager().browserForPreview()).rejects.toThrow(
        'No browser found for preview'
      )
    })
  })
})

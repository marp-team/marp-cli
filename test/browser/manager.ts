import { browserManager, BrowserManager } from '../../src/browser/manager'
import { ChromeBrowser } from '../../src/browser/browsers/chrome'

describe('browserManager static instance', () => {
  it('is an instance of BrowserManager', () => {
    expect(browserManager).toBeInstanceOf(BrowserManager)
  })
})

describe('BrowserManager class', () => {
  describe('#register', () => {
    it('registers a browser', () => {
      const previewBrowser = new ChromeBrowser({ purpose: 'preview' })
      const convertBrowser = new ChromeBrowser({ purpose: 'convert' })
      const manager = new BrowserManager()

      expect(manager.findBy({ browser: previewBrowser })).toBeUndefined()
      expect(manager.findBy({ browser: convertBrowser })).toBeUndefined()

      manager.register(convertBrowser)
      expect(manager.findBy({ browser: previewBrowser })).toBeUndefined()
      expect(manager.findBy({ browser: convertBrowser })).toBe(convertBrowser)

      manager.register(previewBrowser)
      expect(manager.findBy({ browser: previewBrowser })).toBe(previewBrowser)
      expect(manager.findBy({ browser: convertBrowser })).toBe(convertBrowser)
    })
  })

  describe('#findBy', () => {
    it('finds a browser by query', () => {
      const browser = new ChromeBrowser({ purpose: 'convert' })
      const manager = new BrowserManager()

      manager.register(browser)

      // Find by instance
      expect(manager.findBy({ browser })).toBe(browser)
      expect(
        manager.findBy({ browser: new ChromeBrowser({ purpose: 'preview' }) })
      ).toBeUndefined()

      // Find by kind
      expect(manager.findBy({ kind: 'chrome' })).toBe(browser)
      expect(manager.findBy({ kind: 'firefox' })).toBeUndefined()

      // Find by protocol
      expect(manager.findBy({ protocol: 'webdriver-bidi' })).toBe(browser)
      expect(manager.findBy({ protocol: 'cdp' })).toBeUndefined()

      // Find by purpose
      expect(manager.findBy({ purpose: 'convert' })).toBe(browser)
      expect(manager.findBy({ purpose: 'preview' })).toBeUndefined()
    })
  })
})

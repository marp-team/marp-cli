import * as puppeteer from 'puppeteer-core'
import { FirefoxBrowser } from '../../../src/browser/browsers/firefox'

jest.mock('puppeteer-core')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('FirefoxBrowser', () => {
  describe('#launch', () => {
    beforeEach(() => {
      jest
        .spyOn(puppeteer as any, 'launch')
        .mockResolvedValue({ once: jest.fn() })
    })

    it('calls #launch in puppeteer-core', async () => {
      await new FirefoxBrowser({ path: '/path/to/firefox' }).launch()

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          browser: 'firefox',
          protocol: 'webDriverBiDi',
          executablePath: '/path/to/firefox',
        } as const satisfies puppeteer.LaunchOptions)
      )
    })
  })
})

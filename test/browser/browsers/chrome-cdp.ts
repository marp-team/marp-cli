import fs from 'node:fs'
import * as puppeteer from 'puppeteer-core'
import type { CDPSession } from 'puppeteer-core'
import { ChromeBrowser } from '../../../src/browser/browsers/chrome'
import { ChromeCdpBrowser } from '../../../src/browser/browsers/chrome-cdp'

jest.mock('puppeteer-core')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('ChromeCdpBrowser', () => {
  it('extends ChromeBrowser', () => {
    const browser = new ChromeCdpBrowser({ path: '/path/to/chrome' })
    expect(browser).toBeInstanceOf(ChromeBrowser)
  })

  describe('#launch', () => {
    const { platform } = process

    let send: jest.Mock<CDPSession['send']>

    beforeEach(() => {
      jest.resetModules()

      send = jest.fn().mockReturnValue(Promise.resolve())

      jest.spyOn(puppeteer as any, 'launch').mockResolvedValue({
        once: jest.fn(),
        target: jest.fn(() => ({
          createCDPSession: jest.fn(async () => ({ send })),
        })),
      })

      jest.spyOn(fs.promises, 'mkdir').mockImplementation()
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: platform })
    })

    it('calls #launch in puppeteer-core', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      await new ChromeCdpBrowser({ path: '/path/to/chrome' }).launch()

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          browser: 'chrome',
          protocol: 'cdp',
          executablePath: '/path/to/chrome',
        } as const satisfies puppeteer.LaunchOptions)
      )
    })

    it('sets the dock icon through Browser.setDockTile when the platform is darwin (macOS)', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      await new ChromeCdpBrowser({ path: '/path/to/chrome' }).launch()

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({ executablePath: '/path/to/chrome' })
      )
      expect(send).toHaveBeenCalledWith(
        'Browser.setDockTile',
        expect.objectContaining({ image: expect.any(String) })
      )

      // Check a base64 image has header of PNG
      const { image } = send.mock.calls[0][1]
      const imageBuffer = Buffer.from(image, 'base64')

      // Buffer may change an invalid character as UTF-8 encoding to U+FFFD, so it may not start with 0x89
      expect(imageBuffer.subarray(0, 16).toString()).toStrictEqual(
        expect.stringContaining('PNG')
      )
    })
  })
})

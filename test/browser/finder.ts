import path from 'node:path'
import { ChromeBrowser } from '../../src/browser/browsers/chrome'
import { ChromeCdpBrowser } from '../../src/browser/browsers/chrome-cdp'
import { FirefoxBrowser } from '../../src/browser/browsers/firefox'
import { autoFinders, findBrowser } from '../../src/browser/finder'
import { CLIError } from '../../src/error'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

const itOnlyWin = process.platform === 'win32' ? it : it.skip
const itExceptWin = process.platform === 'win32' ? it.skip : it

const executableMock = (name: string) =>
  path.join(__dirname, `../utils/_executable_mocks`, name)

const macBundle = (name: string) =>
  path.join(__dirname, `../utils/_mac_bundles`, name)

describe('Browser finder', () => {
  describe('#findBrowser', () => {
    it('rejects when no finder is specified', async () => {
      await expect(findBrowser([])).rejects.toThrow(CLIError)
    })

    it('resolves as Chrome browser when no finder is specified with preferred executable path', async () => {
      const browser = await findBrowser([], {
        preferredPath: executableMock('empty'),
      })

      expect(browser).toStrictEqual<typeof browser>({
        path: expect.stringMatching(/\bempty$/),
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })

    itExceptWin(
      'rejects when no finder is specified with preferred non-executable path in non-Windows platforms',
      async () => {
        await expect(
          findBrowser([], {
            preferredPath: executableMock('non-executable'),
          })
        ).rejects.toThrow(CLIError)
      }
    )

    itOnlyWin(
      'resolves as Chrome browser when no finder is specified with preferred non-executable path in Windows',
      async () => {
        const browser = await findBrowser([], {
          preferredPath: executableMock('non-executable'),
        })

        expect(browser).toStrictEqual<typeof browser>({
          path: expect.stringMatching(/\bnon-executable$/),
          acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
        })
      }
    )

    it('resolves as Firefox browser when Firefox finder was preferred with preferred executable path', async () => {
      const browser = await findBrowser(['firefox', 'chrome'], {
        preferredPath: executableMock('empty'),
      })

      expect(browser).toStrictEqual<typeof browser>({
        path: expect.stringMatching(/\bempty$/),
        acceptedBrowsers: [FirefoxBrowser],
      })
    })

    describe('with macOS', () => {
      let originalPlatform: string | undefined

      beforeEach(() => {
        originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'darwin' })
      })

      afterEach(() => {
        if (originalPlatform !== undefined) {
          Object.defineProperty(process, 'platform', {
            value: originalPlatform,
          })
        }
        originalPlatform = undefined
      })

      it('normalizes executable path if preferred path was pointed to valid app bundle', async () => {
        const browser = await findBrowser(autoFinders, {
          preferredPath: macBundle('Valid.app'),
        })

        expect(browser).toStrictEqual<typeof browser>({
          path: macBundle('Valid.app/Contents/MacOS/Valid app'),
          acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
        })
      })

      it('does not normalize executable path if preferred path was pointed to invalid app bundle', async () => {
        const browser = await findBrowser(autoFinders, {
          preferredPath: macBundle('Invalid.app'),
        })

        expect(browser).toStrictEqual<typeof browser>({
          path: macBundle('Invalid.app'),
          acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
        })
      })
    })
  })
})

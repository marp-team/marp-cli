import {
  darwinFast,
  linux,
  win32,
  wsl,
} from 'chrome-launcher/dist/chrome-finder'
import { error, CLIErrorCode } from '../../error'
import { ChromeBrowser } from '../browsers/chrome'
import { ChromeCdpBrowser } from '../browsers/chrome-cdp'
import type { BrowserFinder, BrowserFinderResult } from '../finder'
import {
  findExecutableBinary,
  getPlatform,
  isExecutable,
  normalizeDarwinAppPath,
} from './utils'
import { debugBrowserFinder } from '../../utils/debug'
import { getWSL2NetworkingMode } from '../../utils/wsl'

const chrome = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
})

export const chromeFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return chrome(preferredPath)

  if (process.env.CHROME_PATH) {
    const path = await normalizeDarwinAppPath(process.env.CHROME_PATH)
    if (path && (await isExecutable(path))) return chrome(path)
  }

  const platform = await getPlatform()
  const installation = await (async () => {
    switch (platform) {
      case 'darwin':
        return darwinFast()
      case 'linux':
        return (
          linux()[0] ||
          (await (async () => {
            if ((await getWSL2NetworkingMode()) === 'mirrored') {
              debugBrowserFinder(
                'WSL2: Detected "mirrored" networking mode. Try to find Chrome in Windows.'
              )
              return wsl()[0]
            }
          })())
        )
      case 'win32':
        return win32()[0]
      case 'wsl1':
        return wsl()[0]
    }
    return await fallback()
  })()

  if (installation) return chrome(installation)

  error('Chrome browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const fallback = async () =>
  await findExecutableBinary([
    'google-chrome-stable',
    'google-chrome',
    'chrome', // FreeBSD Chromium
    'chromium-browser',
    'chromium',
  ])

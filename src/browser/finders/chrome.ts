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
        return await chromeFinderLinux()
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

const chromeFinderLinux = async () => {
  try {
    const linuxPath = linux()[0]
    if (linuxPath) return linuxPath
  } catch (error) {
    // no ops
  }
  if ((await getWSL2NetworkingMode()) === 'mirrored') return wsl()[0] // WSL2 Fallback
}

const fallback = async () =>
  await findExecutableBinary([
    'google-chrome-stable',
    'google-chrome',
    'chrome', // FreeBSD Chromium
    'chromium-browser',
    'chromium',
  ])

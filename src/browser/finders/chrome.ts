import {
  darwinFast,
  linux,
  win32,
  wsl,
} from 'chrome-launcher/dist/chrome-finder'
import { error, CLIErrorCode } from '../../error'
import { getWSL2NetworkingMode } from '../../utils/wsl'
import { ChromeBrowser } from '../browsers/chrome'
import { ChromeCdpBrowser } from '../browsers/chrome-cdp'
import type { BrowserFinder, BrowserFinderResult } from '../finder'
import {
  findExecutableBinary,
  getPlatform,
  isExecutable,
  normalizeDarwinAppPath,
} from './utils'

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
        return chromeFinderDarwin()
      case 'linux':
        return await chromeFinderLinux()
      case 'win32':
        return chromeFinderWin32()
      case 'wsl1':
        return chromeFinderWSL()
    }
    return await chromeFinderFallack()
  })()

  if (installation) return chrome(installation)

  error('Chrome browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const chromeFinderDarwin = () => darwinFast()
const chromeFinderLinux = async () => {
  try {
    const linuxPath = linux()[0]
    if (linuxPath) return linuxPath
  } catch {
    // no ops
  }

  // WSL2 Fallback
  if ((await getWSL2NetworkingMode()) === 'mirrored') return chromeFinderWSL()

  return undefined
}
const chromeFinderWin32 = (): string | undefined => win32()[0]
const chromeFinderWSL = (): string | undefined => wsl()[0]

const chromeFinderFallack = async () =>
  await findExecutableBinary([
    'google-chrome-stable',
    'google-chrome',
    'chrome', // FreeBSD Chromium
    'chromium-browser',
    'chromium',
  ])

import * as chromeFinderModule from 'chrome-launcher/dist/chrome-finder'
import { error, CLIErrorCode } from '../../error'
import * as finder from '../../utils/finder'
import * as wsl from '../../utils/wsl'
import { ChromeBrowser } from '../browsers/chrome'
import { ChromeCdpBrowser } from '../browsers/chrome-cdp'
import type { BrowserFinder, BrowserFinderResult } from '../finder'

const chrome = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
})

export const chromeFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return chrome(preferredPath)

  if (process.env.CHROME_PATH) {
    const path = await finder.normalizeDarwinAppPath(process.env.CHROME_PATH)
    if (path && (await finder.isExecutable(path))) return chrome(path)
  }

  const platform = await finder.getPlatform()
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
    return await chromeFinderFallback()
  })()

  if (installation) return chrome(installation)

  error('Chrome browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const chromeFinderDarwin = () => chromeFinderModule.darwinFast()
const chromeFinderLinux = async () => {
  try {
    const linuxPath = chromeFinderModule.linux()[0]
    if (linuxPath) return linuxPath
  } catch {
    // no ops
  }

  // WSL2 Fallback
  if ((await wsl.getWSL2NetworkingMode()) === 'mirrored')
    return chromeFinderWSL()

  return undefined
}
const chromeFinderWin32 = (): string | undefined =>
  chromeFinderModule.win32()[0]

const chromeFinderWSL = (): string | undefined => chromeFinderModule.wsl()[0]

const chromeFinderFallback = async () =>
  await finder.findExecutableBinary([
    'google-chrome-stable',
    'google-chrome',
    'chrome', // FreeBSD Chromium
    'chromium-browser',
    'chromium',
  ])

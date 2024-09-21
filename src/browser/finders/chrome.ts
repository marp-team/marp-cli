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
import { getPlatform, isExecutable, which } from './utils'

const chrome = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
})

export const chromeFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return chrome(preferredPath)

  const platform = await getPlatform()
  const installation = (() => {
    switch (platform) {
      case 'darwin':
        return darwinFast()
      case 'linux':
        return linux()[0]
      case 'win32':
        return win32()[0]
      // CI cannot test against WSL environment
      /* c8 ignore start */
      case 'wsl1':
        return wsl()[0]
    }
    return fallback()
    /* c8 ignore stop */
  })()

  if (installation) return chrome(installation)

  error('Chrome browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const fallbackExecutableNames = [
  'google-chrome-stable',
  'google-chrome',
  'chrome', // FreeBSD Chromium
  'chromium-browser',
  'chromium',
] as const

const fallback = () => {
  for (const executableName of fallbackExecutableNames) {
    const executablePath = which(executableName)
    if (executablePath && isExecutable(executablePath)) return executablePath
  }
  return undefined
}

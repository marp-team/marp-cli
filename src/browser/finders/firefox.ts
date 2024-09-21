import path from 'node:path'
import { error, CLIErrorCode } from '../../error'
import { FirefoxBrowser } from '../browsers/firefox'
import type { BrowserFinder, BrowserFinderResult } from '../finder'
import { getPlatform, isExecutable, which } from './utils'

const firefox = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [FirefoxBrowser],
})

const findExecutable = (paths: string[]): string | undefined =>
  paths.find((p) => isExecutable(p))

export const firefoxFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return firefox(preferredPath)

  const platform = await getPlatform()
  const installation = (() => {
    switch (platform) {
      case 'darwin':
        return firefoxFinderDarwin()
      case 'win32':
        return firefoxFinderWin32()
      // CI cannot test against WSL environment
      /* c8 ignore start */
      case 'wsl1':
        return firefoxFinderWSL1()
      /* c8 ignore stop */
    }
    return firefoxFinderFallback()
  })()

  if (installation) return firefox(installation)

  error('Firefox browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const firefoxFinderDarwin = () =>
  findExecutable([
    '/Applications/Firefox Nightly.app/Contents/MacOS/firefox',
    '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
    '/Applications/Firefox.app/Contents/MacOS/firefox', // Firefox stable, ESR, and beta
  ])

const winDriveMatcher = /^[a-z]:\\/i
const winPossibleDrives = () => {
  const possibleDriveSet = new Set<string>()
  const pathEnvs = process.env.PATH?.split(';') ?? ['c:\\']

  for (const pathEnv of pathEnvs) {
    if (winDriveMatcher.test(pathEnv)) {
      possibleDriveSet.add(pathEnv[0].toLowerCase())
    }
  }

  return Array.from(possibleDriveSet).sort()
}

const firefoxFinderWin32 = () => {
  const prefixes: string[] = []

  for (const drive of winPossibleDrives()) {
    for (const prefix of [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
    ]) {
      if (!prefix) continue
      prefixes.push(`${drive}${prefix.slice(1)}`)
    }
  }

  return findExecutable(
    prefixes.flatMap((prefix) => [
      path.join(prefix, 'Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Developer Edition', 'firefox.exe'),
      path.join(prefix, 'Mozilla Firefox', 'firefox.exe'), // Firefox stable, ESR, and beta
    ])
  )
}

const firefoxFinderWSL1 = () => {
  const prefixes: string[] = []

  for (const drive of winPossibleDrives()) {
    prefixes.push(`/mnt/${drive}/Program Files`)
    prefixes.push(`/mnt/${drive}/Program Files (x86)`)
  }

  return findExecutable(
    prefixes.flatMap((prefix) => [
      path.join(prefix, 'Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Developer Edition', 'firefox.exe'),
      path.join(prefix, 'Mozilla Firefox', 'firefox.exe'), // Firefox stable, ESR, and beta
    ])
  )
}

// In Linux, Firefox must have only an executable name `firefox` in every
// editions, but some packages may provide different executable names.
const fallbackExecutableNames = [
  'firefox-nightly',
  'firefox-developer-edition',
  'firefox-developer',
  'firefox-dev',
  'firefox-beta',
  'firefox',
  'firefox-esr',
] as const

const firefoxFinderFallback = () => {
  for (const executableName of fallbackExecutableNames) {
    const executablePath = which(executableName)
    if (executablePath && isExecutable(executablePath)) return executablePath
  }
  return undefined
}

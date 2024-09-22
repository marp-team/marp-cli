import path from 'node:path'
import { error, CLIErrorCode } from '../../error'
import { FirefoxBrowser } from '../browsers/firefox'
import type { BrowserFinder, BrowserFinderResult } from '../finder'
import { getPlatform, findExecutable, findExecutableBinary } from './utils'

const firefox = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [FirefoxBrowser],
})

export const firefoxFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return firefox(preferredPath)

  const platform = await getPlatform()
  const installation = await (async () => {
    switch (platform) {
      case 'darwin':
        return await firefoxFinderDarwin()
      case 'win32':
        return await firefoxFinderWin32()
      // CI cannot test against WSL environment
      /* c8 ignore start */
      case 'wsl1':
        return await firefoxFinderWSL1()
      /* c8 ignore stop */
    }
    return await firefoxFinderFallback()
  })()

  if (installation) return firefox(installation)

  error('Firefox browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const firefoxFinderDarwin = async () =>
  await findExecutable([
    '/Applications/Firefox Nightly.app/Contents/MacOS/firefox',
    '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
    '/Applications/Firefox.app/Contents/MacOS/firefox', // Firefox stable, ESR, and beta
  ])

const firefoxFinderWin32 = async () => {
  const prefixes: string[] = []

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

  for (const drive of winPossibleDrives()) {
    for (const prefix of [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
    ]) {
      if (!prefix) continue
      prefixes.push(`${drive}${prefix.slice(1)}`)
    }
  }

  return await findExecutable(
    prefixes.flatMap((prefix) => [
      path.join(prefix, 'Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Developer Edition', 'firefox.exe'),
      path.join(prefix, 'Mozilla Firefox', 'firefox.exe'), // Firefox stable, ESR, and beta
    ])
  )
}

const firefoxFinderWSL1 = async () => {
  const prefixes: string[] = []

  const winDriveMatcher = /^\/mnt\/[a-z]\//i
  const winPossibleDrives = () => {
    const possibleDriveSet = new Set<string>()
    const pathEnvs = process.env.PATH?.split(':') ?? ['/mnt/c/']

    for (const pathEnv of pathEnvs) {
      if (winDriveMatcher.test(pathEnv)) {
        possibleDriveSet.add(pathEnv[5].toLowerCase())
      }
    }

    return Array.from(possibleDriveSet).sort()
  }

  for (const drive of winPossibleDrives()) {
    prefixes.push(`/mnt/${drive}/Program Files`)
    prefixes.push(`/mnt/${drive}/Program Files (x86)`)
  }

  return await findExecutable(
    prefixes.flatMap((prefix) => [
      path.join(prefix, 'Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Nightly', 'firefox.exe'),
      path.join(prefix, 'Firefox Developer Edition', 'firefox.exe'),
      path.join(prefix, 'Mozilla Firefox', 'firefox.exe'), // Firefox stable, ESR, and beta
    ])
  )
}

const firefoxFinderFallback = async () =>
  await findExecutableBinary(
    // In Linux, Firefox must have only an executable name `firefox` in every
    // editions, but some distributions may have provided different executable
    // names.
    [
      'firefox-nightly',
      'firefox-developer-edition',
      'firefox-developer',
      'firefox-dev',
      'firefox-beta',
      'firefox',
      'firefox-esr',
    ]
  )

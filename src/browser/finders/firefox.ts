import path from 'node:path'
import { error, CLIErrorCode } from '../../error'
// import { getWSL2NetworkingMode } from '../../utils/wsl'
import {
  getPlatform,
  findExecutable,
  findExecutableBinary,
  isExecutable,
  normalizeDarwinAppPath,
} from '../../utils/finder'
import { FirefoxBrowser } from '../browsers/firefox'
import type { BrowserFinder, BrowserFinderResult } from '../finder'

const firefox = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [FirefoxBrowser],
})

const winFirefoxNightly = ['Nightly', 'firefox.exe']
const winFirefoxNightlyAlt = ['Firefox Nightly', 'firefox.exe']
const winFirefoxDevEdition = ['Firefox Developer Edition', 'firefox.exe']
const winFirefoxDefault = ['Mozilla Firefox', 'firefox.exe'] // Firefox stable, ESR, and beta

export const firefoxFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return firefox(preferredPath)

  if (process.env.FIREFOX_PATH) {
    const nPath = await normalizeDarwinAppPath(process.env.FIREFOX_PATH)
    if (nPath && (await isExecutable(nPath))) return firefox(nPath)
  }

  const platform = await getPlatform()
  const installation = await (async () => {
    switch (platform) {
      case 'darwin':
        return await firefoxFinderDarwin()
      case 'win32':
        return await firefoxFinderWin32()
      case 'wsl1':
        return await firefoxFinderWSL()
    }

    return await firefoxFinderLinuxOrFallback()
    /*
    || ((await getWSL2NetworkingMode()) === 'mirrored'
      ? await firefoxFinderWSL() // WSL2 Fallback
      : undefined)
    */
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
    const possibleDriveSet = new Set<string>(['c'])
    const pathEnvs = process.env.PATH?.split(';') ?? []

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
    [
      winFirefoxNightly,
      winFirefoxNightlyAlt,
      winFirefoxDevEdition,
      winFirefoxDefault,
    ].flatMap((suffix) =>
      prefixes.map((prefix) => path.join(prefix, ...suffix))
    )
  )
}

const firefoxFinderWSL = async () => {
  const prefixes: string[] = []

  const winDriveMatcher = /^\/mnt\/[a-z]\//i
  const winPossibleDrives = () => {
    const possibleDriveSet = new Set<string>(['c'])
    const pathEnvs = process.env.PATH?.split(':') ?? []

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
    [
      winFirefoxNightly,
      winFirefoxNightlyAlt,
      winFirefoxDevEdition,
      winFirefoxDefault,
    ].flatMap((suffix) =>
      prefixes.map((prefix) => path.posix.join(prefix, ...suffix))
    )
  )
}

const firefoxFinderLinuxOrFallback = async () =>
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

import fs from 'node:fs'
import path from 'node:path'
import {
  darwinFast,
  linux,
  win32,
  wsl,
} from 'chrome-launcher/dist/chrome-finder'
import { parse as parsePlist } from 'fast-plist'
import { isWSL } from './wsl'

const macAppDirectoryMatcher = /.app\/?$/

// A lightweight version of Launcher.getFirstInstallation()
// https://github.com/GoogleChrome/chrome-launcher/blob/30755cde8627b7aad6caff1594c9752f80a39a4d/src/chrome-launcher.ts#L189-L192
export const findChromeInstallation = async () => {
  // 'wsl' platform will resolve Chrome from Windows. In WSL 2, Puppeteer cannot
  // communicate with Chrome spawned in the host OS so should follow the
  // original platform ('linux') if CLI was executed in WSL 2.
  const platform = (await isWSL()) === 1 ? 'wsl' : process.platform

  const installations = await (async () => {
    switch (platform) {
      case 'darwin':
        return await withNormalizedChromePathForDarwin(() => [darwinFast()])
      case 'linux':
        return linux()
      case 'win32':
        return win32()
      // CI cannot test against WSL environment
      /* c8 ignore start */
      case 'wsl':
        return wsl()
    }
    return []
    /* c8 ignore stop */
  })()

  return installations[0]
}

/**
 * Run callback with modified CHROME_PATH env variable if it has been pointed to
 * the ".app" directory instead of the executable binary for Darwin.
 */
export const withNormalizedChromePathForDarwin = async <T>(
  callback: () => T
): Promise<T> => {
  const originalChromePath = Object.prototype.hasOwnProperty.call(
    process.env,
    'CHROME_PATH'
  )
    ? process.env.CHROME_PATH
    : undefined

  if (
    originalChromePath !== undefined &&
    macAppDirectoryMatcher.test(originalChromePath)
  ) {
    try {
      const appDirStat = await fs.promises.stat(originalChromePath)

      if (appDirStat.isDirectory()) {
        const manifestPath = path.join(
          originalChromePath,
          'Contents',
          'Info.plist'
        )
        const manifestBody = await fs.promises.readFile(manifestPath)
        const manifest = parsePlist(manifestBody.toString())

        if (
          manifest.CFBundlePackageType == 'APPL' &&
          manifest.CFBundleExecutable
        ) {
          process.env.CHROME_PATH = path.join(
            originalChromePath,
            'Contents',
            'MacOS',
            manifest.CFBundleExecutable
          )
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    return await callback()
  } finally {
    if (originalChromePath !== undefined) {
      process.env.CHROME_PATH = originalChromePath
    }
  }
}

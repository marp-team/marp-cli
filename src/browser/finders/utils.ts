import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parse as parsePlist } from 'fast-plist'
import { debugBrowserFinder } from '../../utils/debug'
import { isWSL } from '../../utils/wsl'

// Common
export const getPlatform = async () =>
  (await isWSL()) === 1 ? 'wsl1' : process.platform

export const isAccessible = (path: string, mode?: number) => {
  try {
    fs.accessSync(path, mode)
    return true
  } catch {
    return false
  }
}

export const isExecutable = (path: string) =>
  isAccessible(path, fs.constants.X_OK)

// Linux
export const isSnapBrowser = async (executablePath: string) => {
  if (process.platform !== 'linux') return false

  // Snap binary
  if (executablePath.startsWith('/snap/')) return true

  // Check the content of shebang script (Chrome for Linux has an alias script to call the snap binary)
  if (isShebang(executablePath)) {
    const scriptContent = await fs.promises.readFile(executablePath)
    if (scriptContent.includes('/snap/')) return true
  }

  return false
}

export const which = (command: string) => {
  if (process.platform === 'win32') {
    debugBrowserFinder(
      '"which %s" command is not available on Windows.',
      command
    )
    return undefined
  }

  try {
    const [ret] = execFileSync('which', [command], { stdio: 'pipe' })
      .toString()
      .split(/\r?\n/)

    return ret
  } catch {
    return undefined
  }
}

const isShebang = (path: string) => {
  let fd: number | null = null

  try {
    fd = fs.openSync(path, 'r')

    const shebangBuffer = Buffer.alloc(2)
    fs.readSync(fd, shebangBuffer, 0, 2, 0)

    if (shebangBuffer[0] === 0x23 && shebangBuffer[1] === 0x21) return true
  } catch {
    // no ops
  } finally {
    if (fd !== null) fs.closeSync(fd)
  }
  return false
}

// Darwin
const darwinAppDirectoryMatcher = /.app\/?$/

export const normalizeDarwinAppPath = async (
  executablePath: string
): Promise<string> => {
  if (process.platform !== 'darwin') return executablePath
  if (!darwinAppDirectoryMatcher.test(executablePath)) return executablePath

  debugBrowserFinder(`Maybe macOS app bundle path: ${executablePath}`)

  try {
    const appDirStat = await fs.promises.stat(executablePath)

    if (appDirStat.isDirectory()) {
      const manifestPath = path.join(executablePath, 'Contents', 'Info.plist')
      const manifestBody = await fs.promises.readFile(manifestPath)
      const manifest = parsePlist(manifestBody.toString())

      if (
        manifest.CFBundlePackageType == 'APPL' &&
        manifest.CFBundleExecutable
      ) {
        const normalizedPath = path.join(
          executablePath,
          'Contents',
          'MacOS',
          manifest.CFBundleExecutable
        )

        debugBrowserFinder(
          `macOS app bundle has been confirmed. Use normalized executable path: ${normalizedPath}`
        )

        return normalizedPath
      }
    }
  } catch {
    // ignore
  }

  return executablePath
}

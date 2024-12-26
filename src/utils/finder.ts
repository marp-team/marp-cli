import fs from 'node:fs'
import path from 'node:path'
import { parse as parsePlist } from 'fast-plist'
import nodeWhich from 'which'
import { debugBrowserFinder } from './debug'
import { isWSL } from './wsl'

export const getPlatform = async () =>
  (await isWSL()) === 1 ? 'wsl1' : process.platform

export const isAccessible = async (path: string, mode?: number) => {
  try {
    await fs.promises.access(path, mode)
    return true
  } catch {
    return false
  }
}

export const isExecutable = async (path: string) =>
  await isAccessible(path, fs.constants.X_OK)

export const isReadable = async (path: string) =>
  await isAccessible(path, fs.constants.R_OK)

const findFirst = async <T>(
  paths: string[],
  predicate: (path: string) => Promise<T>
) => {
  const pathsCount = paths.length
  if (pathsCount === 0) return undefined

  return new Promise<T | undefined>((resolve) => {
    const result = Array<T | undefined>(pathsCount)
    const resolved = Array<boolean | undefined>(pathsCount)

    paths.forEach((p, index) => {
      predicate(p)
        .then((ret) => {
          result[index] = ret
          resolved[index] = !!ret
        })
        .catch((e) => {
          debugBrowserFinder('%o', e)
          resolved[index] = false
        })
        .finally(() => {
          let target: number | undefined

          for (let i = pathsCount - 1; i >= 0; i -= 1) {
            if (resolved[i] !== false) target = i
          }

          if (target === undefined) {
            resolve(undefined)
          } else if (resolved[target]) {
            resolve(result[target])
          }
        })
    })
  })
}

export const findExecutable = async (paths: string[]) =>
  await findFirst(paths, async (path) =>
    (await isExecutable(path)) ? path : undefined
  )

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

export const findExecutableBinary = async (binaries: string[]) =>
  await findFirst(binaries, async (binary) => {
    const binaryPath = await which(binary)
    if (binaryPath && (await isExecutable(binaryPath))) return binaryPath
    return undefined
  })

export const which = async (command: string) =>
  (await nodeWhich(command, { nothrow: true })) ?? undefined

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

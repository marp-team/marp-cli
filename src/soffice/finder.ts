import path from 'node:path'
import { CLIErrorCode, error } from '../error'
import {
  findExecutable,
  findExecutableBinary,
  getPlatform,
  isExecutable,
  normalizeDarwinAppPath,
} from '../utils/finder'

const sOffice = (path: string) => ({ path }) as const

export const findSOffice = async ({
  preferredPath,
}: { preferredPath?: string } = {}) => {
  if (preferredPath) return sOffice(preferredPath)

  if (process.env.SOFFICE_PATH) {
    const nPath = await normalizeDarwinAppPath(process.env.SOFFICE_PATH)
    if (nPath && (await isExecutable(nPath))) return sOffice(nPath)
  }

  const platform = await getPlatform()
  const installation = await (async () => {
    switch (platform) {
      case 'darwin':
        return await sOfficeFinderDarwin()
      case 'win32':
        return await sOfficeFinderWin32()
      case 'wsl1':
        return await sOfficeFinderWSL()
    }

    return await sOfficeFinderLinuxOrFallback()
  })()

  if (installation) return sOffice(installation)

  error(
    'LibreOffice soffice binary could not be found.',
    CLIErrorCode.NOT_FOUND_SOFFICE
  )
}

const sOfficeFinderDarwin = async () =>
  await findExecutable(['/Applications/LibreOffice.app/Contents/MacOS/soffice'])

const sOfficeFinderWin32 = async () => {
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
    prefixes.map((prefix) =>
      path.join(prefix, 'LibreOffice', 'program', 'soffice.exe')
    )
  )
}

const sOfficeFinderWSL = async () => {
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
    prefixes.map((prefix) =>
      path.posix.join(prefix, 'LibreOffice', 'program', 'soffice.exe')
    )
  )
}

const sOfficeFinderLinuxOrFallback = async () =>
  await findExecutableBinary(['soffice'])

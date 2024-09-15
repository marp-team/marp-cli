import { accessSync, constants } from 'node:fs'
import path from 'node:path'
import { isWSL, resolveWindowsEnvSync, resolveWSLPathToGuestSync } from './wsl'

export const findAccessiblePath = (paths: string[]): string | undefined =>
  paths.find((p) => {
    try {
      accessSync(p, constants.X_OK)
      return true
    } catch {
      // no ops
    }
    return false
  })

const linux = async (): Promise<string | undefined> => {
  // WSL 1 should find Edge executable from host OS
  if ((await isWSL()) === 1) {
    const localAppData = resolveWindowsEnvSync('LOCALAPPDATA')

    return win32({
      programFiles: '/mnt/c/Program Files',
      programFilesX86: '/mnt/c/Program Files (x86)',
      localAppData: localAppData ? resolveWSLPathToGuestSync(localAppData) : '',
    })
  }

  return findAccessiblePath([
    '/opt/microsoft/msedge-canary/msedge',
    '/opt/microsoft/msedge-dev/msedge',
    '/opt/microsoft/msedge-beta/msedge',
    '/opt/microsoft/msedge/msedge',
  ])
}

const darwin = (): string | undefined =>
  findAccessiblePath([
    '/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary',
    '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
    '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ])

const win32 = ({
  programFiles = process.env.PROGRAMFILES,
  programFilesX86 = process.env['PROGRAMFILES(X86)'],
  localAppData = process.env.LOCALAPPDATA,
}: {
  programFiles?: string
  programFilesX86?: string
  localAppData?: string
} = {}): string | undefined => {
  const prefixes = [localAppData, programFiles, programFilesX86].filter(
    (p): p is string => !!p
  )

  return findAccessiblePath(
    [
      path.join('Microsoft', 'Edge SxS', 'Application', 'msedge.exe'),
      path.join('Microsoft', 'Edge Dev', 'Application', 'msedge.exe'),
      path.join('Microsoft', 'Edge Beta', 'Application', 'msedge.exe'),
      path.join('Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ].reduce<string[]>(
      (acc, suffix) => [
        ...acc,
        ...prefixes.map((prefix) => path.join(prefix, suffix)),
      ],
      []
    )
  )
}

export const findEdgeInstallation = async (): Promise<string | undefined> => {
  if (process.platform === 'linux') return await linux()
  if (process.platform === 'darwin') return darwin()
  if (process.platform === 'win32') return win32()

  return undefined
}

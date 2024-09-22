import path from 'node:path'
import { error, CLIErrorCode } from '../../error'
import {
  resolveWSLPathToGuestSync,
  resolveWindowsEnvSync,
} from '../../utils/wsl'
import { ChromeBrowser } from '../browsers/chrome'
import { ChromeCdpBrowser } from '../browsers/chrome-cdp'
import type { BrowserFinder, BrowserFinderResult } from '../finder'
import { findExecutable, getPlatform } from './utils'

const edge = (path: string): BrowserFinderResult => ({
  path,
  acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
})

export const edgeFinder: BrowserFinder = async ({ preferredPath } = {}) => {
  if (preferredPath) return edge(preferredPath)

  const platform = await getPlatform()
  const installation = await (async () => {
    switch (platform) {
      case 'darwin':
        return await edgeFinderDarwin()
      case 'linux':
        return await edgeFinderLinux()
      case 'win32':
        return await edgeFinderWin32()
      case 'wsl1':
        return await edgeFinderWSL1()
    }
    return undefined
  })()

  if (installation) return edge(installation)

  error('Edge browser could not be found.', CLIErrorCode.NOT_FOUND_BROWSER)
}

const edgeFinderDarwin = async () =>
  await findExecutable([
    '/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary',
    '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
    '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ])

const edgeFinderLinux = async () =>
  await findExecutable([
    '/opt/microsoft/msedge-canary/msedge',
    '/opt/microsoft/msedge-dev/msedge',
    '/opt/microsoft/msedge-beta/msedge',
    '/opt/microsoft/msedge/msedge',
  ])

const edgeFinderWin32 = async ({
  programFiles = process.env.PROGRAMFILES,
  programFilesX86 = process.env['PROGRAMFILES(X86)'],
  localAppData = process.env.LOCALAPPDATA,
}: {
  programFiles?: string
  programFilesX86?: string
  localAppData?: string
} = {}): Promise<string | undefined> => {
  const paths: string[] = []

  const suffixes = [
    ['Microsoft', 'Edge SxS', 'Application', 'msedge.exe'],
    ['Microsoft', 'Edge Dev', 'Application', 'msedge.exe'],
    ['Microsoft', 'Edge Beta', 'Application', 'msedge.exe'],
    ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
  ]

  for (const suffix of suffixes) {
    for (const prefix of [localAppData, programFiles, programFilesX86]) {
      if (prefix) paths.push(path.join(prefix, ...suffix))
    }
  }

  return await findExecutable(paths)
}

const edgeFinderWSL1 = async () => {
  const localAppData = resolveWindowsEnvSync('LOCALAPPDATA')

  return await edgeFinderWin32({
    programFiles: '/mnt/c/Program Files',
    programFilesX86: '/mnt/c/Program Files (x86)',
    localAppData: localAppData && resolveWSLPathToGuestSync(localAppData),
  })
}

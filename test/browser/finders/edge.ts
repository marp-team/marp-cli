import path from 'node:path'
import { ChromeBrowser } from '../../../src/browser/browsers/chrome'
import { ChromeCdpBrowser } from '../../../src/browser/browsers/chrome-cdp'
import { edgeFinder } from '../../../src/browser/finders/edge'
import * as utils from '../../../src/browser/finders/utils'
import { CLIError } from '../../../src/error'
import * as wsl from '../../../src/utils/wsl'

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

const winEdgeCanary = ['Microsoft', 'Edge SxS', 'Application', 'msedge.exe']
const winEdgeDev = ['Microsoft', 'Edge Dev', 'Application', 'msedge.exe']
const winEdgeBeta = ['Microsoft', 'Edge Beta', 'Application', 'msedge.exe']
const winEdgeStable = ['Microsoft', 'Edge', 'Application', 'msedge.exe']

describe('Edge finder', () => {
  describe('with preferred path', () => {
    it('returns the preferred path as edge', async () => {
      const edge = await edgeFinder({
        preferredPath: '/test/preferred/edge',
      })

      expect(edge).toStrictEqual({
        path: '/test/preferred/edge',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })
  })

  describe('with Linux', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('linux')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(async (p) => p === '/opt/microsoft/msedge/msedge')
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await edgeFinder({})

      expect(edge).toStrictEqual({
        path: '/opt/microsoft/msedge/msedge',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        '/opt/microsoft/msedge-canary/msedge',
        '/opt/microsoft/msedge-dev/msedge',
        '/opt/microsoft/msedge-beta/msedge',
        '/opt/microsoft/msedge/msedge',
      ])
    })

    it('prefers the latest version if multiple binaries are matched', async () => {
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) =>
            p === '/opt/microsoft/msedge-dev/msedge' ||
            p === '/opt/microsoft/msedge-beta/msedge'
        )

      const edge = await edgeFinder({})

      expect(edge).toStrictEqual({
        path: '/opt/microsoft/msedge-dev/msedge',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(edgeFinder({})).rejects.toThrow(CLIError)
    })
  })

  describe('with macOS', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('darwin')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) =>
            p ===
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        )
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await edgeFinder({})

      expect(edge).toStrictEqual({
        path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        '/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary',
        '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
        '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ])
    })

    it('prefers the latest version if multiple binaries are matched', async () => {
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) =>
            p ===
              '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev' ||
            p ===
              '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta'
        )

      const edge = await edgeFinder({})

      expect(edge).toStrictEqual({
        path: '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(edgeFinder({})).rejects.toThrow(CLIError)
    })
  })

  describe('with Windows', () => {
    const winProgramFiles = ['C:', 'Mock', 'Program Files']
    const winProgramFilesX86 = ['C:', 'Mock', 'Program Files (x86)']
    const winLocalAppData = ['C:', 'Mock', 'AppData', 'Local']

    const edgePath = path.join(...winProgramFiles, ...winEdgeStable)
    const originalEnv = { ...process.env }

    beforeEach(() => {
      jest.resetModules()

      jest.spyOn(utils, 'getPlatform').mockResolvedValue('win32')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(async (p) => p === edgePath)

      process.env = {
        ...originalEnv,
        PROGRAMFILES: path.join(...winProgramFiles),
        'PROGRAMFILES(X86)': path.join(...winProgramFilesX86),
        LOCALAPPDATA: path.join(...winLocalAppData),
      }
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await edgeFinder({})

      expect(edge).toStrictEqual({
        path: edgePath,
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join(...winLocalAppData, ...winEdgeCanary),
        path.join(...winProgramFiles, ...winEdgeCanary),
        path.join(...winProgramFilesX86, ...winEdgeCanary),
        path.join(...winLocalAppData, ...winEdgeDev),
        path.join(...winProgramFiles, ...winEdgeDev),
        path.join(...winProgramFilesX86, ...winEdgeDev),
        path.join(...winLocalAppData, ...winEdgeBeta),
        path.join(...winProgramFiles, ...winEdgeBeta),
        path.join(...winProgramFilesX86, ...winEdgeBeta),
        path.join(...winLocalAppData, ...winEdgeStable),
        path.join(...winProgramFiles, ...winEdgeStable),
        path.join(...winProgramFilesX86, ...winEdgeStable),
      ])
    })

    it('skips inaccessible directories to find', async () => {
      process.env['PROGRAMFILES(X86)'] = '' // No WOW64

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await edgeFinder({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join(...winLocalAppData, ...winEdgeCanary),
        path.join(...winProgramFiles, ...winEdgeCanary),
        path.join(...winLocalAppData, ...winEdgeDev),
        path.join(...winProgramFiles, ...winEdgeDev),
        path.join(...winLocalAppData, ...winEdgeBeta),
        path.join(...winProgramFiles, ...winEdgeBeta),
        path.join(...winLocalAppData, ...winEdgeStable),
        path.join(...winProgramFiles, ...winEdgeStable),
      ])
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(edgeFinder({})).rejects.toThrow(CLIError)
    })
  })

  describe('with WSL1', () => {
    const wsl1EdgePath = path.posix.join(
      '/mnt/c/Program Files',
      ...winEdgeStable
    )

    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('wsl1')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(async (p) => p === wsl1EdgePath)
      jest
        .spyOn(wsl, 'getWindowsEnv')
        .mockResolvedValue('C:\\Mock\\AppData\\Local')
      jest
        .spyOn(wsl, 'translateWindowsPathToWSL')
        .mockResolvedValue('/mnt/c/mock/AppData/Local')
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await edgeFinder({})

      expect(edge).toStrictEqual({
        path: wsl1EdgePath,
        acceptedBrowsers: [ChromeBrowser, ChromeCdpBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.posix.join('/mnt/c/mock/AppData/Local', ...winEdgeCanary),
        path.posix.join('/mnt/c/Program Files', ...winEdgeCanary),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeCanary),
        path.posix.join('/mnt/c/mock/AppData/Local', ...winEdgeDev),
        path.posix.join('/mnt/c/Program Files', ...winEdgeDev),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeDev),
        path.posix.join('/mnt/c/mock/AppData/Local', ...winEdgeBeta),
        path.posix.join('/mnt/c/Program Files', ...winEdgeBeta),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeBeta),
        path.posix.join('/mnt/c/mock/AppData/Local', ...winEdgeStable),
        path.posix.join('/mnt/c/Program Files', ...winEdgeStable),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeStable),
      ])
    })

    it('skips inaccessible directories to find', async () => {
      jest.spyOn(wsl, 'getWindowsEnv').mockResolvedValue(undefined)

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await edgeFinder({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.posix.join('/mnt/c/Program Files', ...winEdgeCanary),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeCanary),
        path.posix.join('/mnt/c/Program Files', ...winEdgeDev),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeDev),
        path.posix.join('/mnt/c/Program Files', ...winEdgeBeta),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeBeta),
        path.posix.join('/mnt/c/Program Files', ...winEdgeStable),
        path.posix.join('/mnt/c/Program Files (x86)', ...winEdgeStable),
      ])
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(edgeFinder({})).rejects.toThrow(CLIError)
    })
  })

  describe('with other platforms', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('openbsd')
    })

    it('throws error', async () => {
      await expect(edgeFinder({})).rejects.toThrow(CLIError)
    })
  })
})

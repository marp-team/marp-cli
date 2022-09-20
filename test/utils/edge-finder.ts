import path from 'path'
import * as edgeFinder from '../../src/utils/edge-finder'
import * as wsl from '../../src/utils/wsl'

jest.mock('../../src/utils/wsl')

let originalPlatform: NodeJS.Platform | undefined

const winEdgeCanary = ['Microsoft', 'Edge SxS', 'Application', 'msedge.exe']
const winEdgeDev = ['Microsoft', 'Edge Dev', 'Application', 'msedge.exe']
const winEdgeBeta = ['Microsoft', 'Edge Beta', 'Application', 'msedge.exe']
const winEdgeStable = ['Microsoft', 'Edge', 'Application', 'msedge.exe']

beforeEach(() => jest.spyOn(wsl, 'isWSL').mockImplementation())
afterEach(() => {
  jest.restoreAllMocks()

  if (originalPlatform) {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  }
})

describe('#findAccessiblePath', () => {
  it('return the first accessible path', () => {
    const unknownFile = path.resolve(__dirname, 'unknown')
    const marpCliExecutable = path.resolve(__dirname, '../../marp-cli.js')

    expect(
      edgeFinder.findAccessiblePath([unknownFile, marpCliExecutable])
    ).toBe(marpCliExecutable)
    expect(edgeFinder.findAccessiblePath([unknownFile])).toBeUndefined()
  })
})

describe('#findEdgeInstallation', () => {
  describe('Windows', () => {
    beforeEach(() => {
      originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })
    })

    it('finds out the first accessible Edge from 3 locations', () => {
      const currentEnv = process.env

      const programFiles = path.join('C:', 'Mock', 'Program Files')
      const programFilesX86 = path.join('C:', 'Mock', 'Program Files (x86)')
      const localAppData = path.join('C:', 'Mock', 'Local')

      try {
        process.env.PROGRAMFILES = programFiles
        process.env['PROGRAMFILES(X86)'] = programFilesX86
        process.env.LOCALAPPDATA = localAppData

        const findAccessiblePath = jest
          .spyOn(edgeFinder, 'findAccessiblePath')
          .mockImplementation(
            () => 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
          )

        expect(edgeFinder.findEdgeInstallation()).toBe(
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
        )
        expect(findAccessiblePath.mock.calls[0][0]).toStrictEqual([
          path.join(localAppData, ...winEdgeCanary),
          path.join(programFiles, ...winEdgeCanary),
          path.join(programFilesX86, ...winEdgeCanary),
          path.join(localAppData, ...winEdgeDev),
          path.join(programFiles, ...winEdgeDev),
          path.join(programFilesX86, ...winEdgeDev),
          path.join(localAppData, ...winEdgeBeta),
          path.join(programFiles, ...winEdgeBeta),
          path.join(programFilesX86, ...winEdgeBeta),
          path.join(localAppData, ...winEdgeStable),
          path.join(programFiles, ...winEdgeStable),
          path.join(programFilesX86, ...winEdgeStable),
        ])
      } finally {
        delete process.env.PROGRAMFILES
        delete process.env['PROGRAMFILES(X86)']
        delete process.env.LOCALAPPDATA

        process.env = currentEnv
      }
    })
  })

  describe('macOS', () => {
    beforeEach(() => {
      originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin' })
    })

    it('finds out the first accessible Edge from specific paths', () => {
      const findAccessiblePath = jest
        .spyOn(edgeFinder, 'findAccessiblePath')
        .mockImplementation(
          () => '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        )

      expect(edgeFinder.findEdgeInstallation()).toBe(
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      )
      expect(findAccessiblePath.mock.calls[0][0]).toMatchInlineSnapshot(`
        [
          "/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary",
          "/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev",
          "/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
      `)
    })
  })

  describe('Linux', () => {
    beforeEach(() => {
      originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux' })
    })

    it('finds out the first accessible Edge from specific paths', () => {
      const findAccessiblePath = jest
        .spyOn(edgeFinder, 'findAccessiblePath')
        .mockImplementation(() => '/opt/microsoft/msedge/msedge')

      expect(edgeFinder.findEdgeInstallation()).toBe(
        '/opt/microsoft/msedge/msedge'
      )
      expect(findAccessiblePath.mock.calls[0][0]).toMatchInlineSnapshot(`
        [
          "/opt/microsoft/msedge-canary/msedge",
          "/opt/microsoft/msedge-dev/msedge",
          "/opt/microsoft/msedge-beta/msedge",
          "/opt/microsoft/msedge/msedge",
        ]
      `)
    })

    describe('on Windows WSL', () => {
      beforeEach(() => jest.spyOn(wsl, 'isWSL').mockImplementation(() => 1))

      it('finds out the first accessible Edge from mounted Windows location', () => {
        const findAccessiblePath = jest
          .spyOn(edgeFinder, 'findAccessiblePath')
          .mockImplementation()

        const resolveWindowsEnvSync = jest
          .spyOn(wsl, 'resolveWindowsEnvSync')
          .mockImplementation(() => 'C:\\Mock\\Local')

        const resolveWSLPathToGuestSync = jest
          .spyOn(wsl, 'resolveWSLPathToGuestSync')
          .mockImplementation(() => '/mnt/c/mock/Local')

        edgeFinder.findEdgeInstallation()
        expect(resolveWindowsEnvSync).toHaveBeenCalledWith('LOCALAPPDATA')
        expect(resolveWSLPathToGuestSync).toHaveBeenCalledWith(
          'C:\\Mock\\Local'
        )
        expect(findAccessiblePath).toHaveBeenCalledWith([
          path.join('/mnt/c/mock/Local', ...winEdgeCanary),
          path.join('/mnt/c/Program Files', ...winEdgeCanary),
          path.join('/mnt/c/Program Files (x86)', ...winEdgeCanary),
          path.join('/mnt/c/mock/Local', ...winEdgeDev),
          path.join('/mnt/c/Program Files', ...winEdgeDev),
          path.join('/mnt/c/Program Files (x86)', ...winEdgeDev),
          path.join('/mnt/c/mock/Local', ...winEdgeBeta),
          path.join('/mnt/c/Program Files', ...winEdgeBeta),
          path.join('/mnt/c/Program Files (x86)', ...winEdgeBeta),
          path.join('/mnt/c/mock/Local', ...winEdgeStable),
          path.join('/mnt/c/Program Files', ...winEdgeStable),
          path.join('/mnt/c/Program Files (x86)', ...winEdgeStable),
        ])
      })
    })
  })

  describe('Unknown platform', () => {
    beforeEach(() => {
      originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'unknown' })
    })

    it('returns undefined', () => {
      expect(edgeFinder.findEdgeInstallation()).toBeUndefined()
    })
  })
})

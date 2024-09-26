import path from 'node:path'
import which from 'which'
import { FirefoxBrowser } from '../../../src/browser/browsers/firefox'
import { firefoxFinder } from '../../../src/browser/finders/firefox'
import * as utils from '../../../src/browser/finders/utils'
import { CLIError } from '../../../src/error'

jest.mock('which')

const mockedWhich = jest.mocked(which<{ nothrow: true }>)

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
  mockedWhich.mockReset()
  mockedWhich.mockRestore()
})

const winFxNightly = ['Nightly', 'firefox.exe']
const winFxNightlyAlt = ['Firefox Nightly', 'firefox.exe']
const winFxDev = ['Firefox Developer Edition', 'firefox.exe']
const winFx = ['Mozilla Firefox', 'firefox.exe']

const executableMock = (name: string) =>
  path.join(__dirname, `../../utils/_executable_mocks`, name)

describe('Firefox finder', () => {
  describe('with preferred path', () => {
    it('returns the preferred path as edge', async () => {
      const firefox = await firefoxFinder({
        preferredPath: '/test/preferred/firefox',
      })

      expect(firefox).toStrictEqual({
        path: '/test/preferred/firefox',
        acceptedBrowsers: [FirefoxBrowser],
      })
    })
  })

  describe('with FIREFOX_PATH environment variable', () => {
    const originalEnv = { ...process.env }
    const regularResolution = new Error('Starting regular resolution')

    beforeEach(() => {
      jest.resetModules()
      jest.spyOn(utils, 'getPlatform').mockRejectedValue(regularResolution)
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('return the path for executable specified in FIREFOX_PATH', async () => {
      process.env.FIREFOX_PATH = executableMock('empty')

      expect(await firefoxFinder({})).toStrictEqual({
        path: process.env.FIREFOX_PATH,
        acceptedBrowsers: [FirefoxBrowser],
      })
    })

    it('processes regular resolution if FIREFOX_PATH is not executable', async () => {
      process.env.FIREFOX_PATH = executableMock('non-executable')

      await expect(firefoxFinder({})).rejects.toThrow(regularResolution)
    })

    it('processes regular resolution if FIREFOX_PATH is not found', async () => {
      process.env.FIREFOX_PATH = executableMock('not-found')

      await expect(firefoxFinder({})).rejects.toThrow(regularResolution)
    })

    it('prefers the preferred path over FIREFOX_PATH', async () => {
      process.env.FIREFOX_PATH = executableMock('empty')

      expect(
        await firefoxFinder({ preferredPath: '/test/preferred/firefox' })
      ).toStrictEqual({
        path: '/test/preferred/firefox',
        acceptedBrowsers: [FirefoxBrowser],
      })
    })
  })

  describe('with Linux', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('linux')
    })

    it('finds possible binaries from PATH by using which command, and return resolved path', async () => {
      mockedWhich.mockImplementation(async (command) => {
        if (command === 'firefox') return executableMock('empty')
        return null
      })

      const firefox = await firefoxFinder({})

      expect(firefox).toStrictEqual({
        path: executableMock('empty'),
        acceptedBrowsers: [FirefoxBrowser],
      })
      expect(which).toHaveBeenCalledWith('firefox', { nothrow: true })
    })

    it('prefers the latest version if multiple binaries are found', async () => {
      mockedWhich.mockImplementation(async (command) => {
        if (command === 'firefox-nightly') return executableMock('empty')
        if (command === 'firefox') return executableMock('shebang-chromium')

        return null
      })

      const firefox = await firefoxFinder({})

      expect(firefox).toStrictEqual({
        path: executableMock('empty'),
        acceptedBrowsers: [FirefoxBrowser],
      })
    })

    it('throws error if the path was not resolved', async () => {
      mockedWhich.mockResolvedValue(null)

      await expect(firefoxFinder({})).rejects.toThrow(CLIError)
      expect(which).toHaveBeenCalled()
    })

    it('throws error if the which command has rejected by error', async () => {
      mockedWhich.mockRejectedValue(new Error('Unexpected error'))

      await expect(firefoxFinder({})).rejects.toThrow(CLIError)
      expect(which).toHaveBeenCalled()
    })
  })

  describe('with macOS', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('darwin')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) => p === '/Applications/Firefox.app/Contents/MacOS/firefox'
        )
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await firefoxFinder({})

      expect(edge).toStrictEqual({
        path: '/Applications/Firefox.app/Contents/MacOS/firefox',
        acceptedBrowsers: [FirefoxBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        '/Applications/Firefox Nightly.app/Contents/MacOS/firefox',
        '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
        '/Applications/Firefox.app/Contents/MacOS/firefox',
      ])
    })

    it('prefers the latest version if multiple binaries are matched', async () => {
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) =>
            p ===
              '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox' ||
            p === '/Applications/Firefox.app/Contents/MacOS/firefox'
        )

      const edge = await firefoxFinder({})

      expect(edge).toStrictEqual({
        path: '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
        acceptedBrowsers: [FirefoxBrowser],
      })
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(firefoxFinder({})).rejects.toThrow(CLIError)
    })
  })

  describe('with Windows', () => {
    const winProgramFiles = ['c:', 'Mock', 'Program Files']
    const winProgramFilesX86 = ['c:', 'Mock', 'Program Files (x86)']

    const firefoxPath = path.join(
      ...winProgramFiles,
      'Mozilla Firefox',
      'firefox.exe'
    )
    const originalEnv = { ...process.env }

    beforeEach(() => {
      jest.resetModules()

      jest.spyOn(utils, 'getPlatform').mockResolvedValue('win32')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(async (p) => p === firefoxPath)

      process.env = {
        ...originalEnv,
        PATH: undefined,
        PROGRAMFILES: path.join(...winProgramFiles),
        'PROGRAMFILES(X86)': path.join(...winProgramFilesX86),
      }
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await firefoxFinder({})

      expect(edge).toStrictEqual({
        path: firefoxPath,
        acceptedBrowsers: [FirefoxBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join(...winProgramFiles, ...winFxNightly),
        path.join(...winProgramFilesX86, ...winFxNightly),
        path.join(...winProgramFiles, ...winFxNightlyAlt),
        path.join(...winProgramFilesX86, ...winFxNightlyAlt),
        path.join(...winProgramFiles, ...winFxDev),
        path.join(...winProgramFilesX86, ...winFxDev),
        path.join(...winProgramFiles, ...winFx),
        path.join(...winProgramFilesX86, ...winFx),
      ])
    })

    it('skips inaccessible directories to find', async () => {
      process.env['PROGRAMFILES(X86)'] = '' // No WOW64

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await firefoxFinder({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join(...winProgramFiles, ...winFxNightly),
        path.join(...winProgramFiles, ...winFxNightlyAlt),
        path.join(...winProgramFiles, ...winFxDev),
        path.join(...winProgramFiles, ...winFx),
      ])
    })

    it('finds from detected drives when the PATH environment has paths starting with any drive letters', async () => {
      process.env.PATH = 'z:\\Mock;D:\\Mock;d:\\Mock\\Mock;'

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await firefoxFinder({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join('c:', ...winProgramFiles.slice(1), ...winFxNightly),
        path.join('c:', ...winProgramFilesX86.slice(1), ...winFxNightly),
        path.join('d:', ...winProgramFiles.slice(1), ...winFxNightly),
        path.join('d:', ...winProgramFilesX86.slice(1), ...winFxNightly),
        path.join('z:', ...winProgramFiles.slice(1), ...winFxNightly),
        path.join('z:', ...winProgramFilesX86.slice(1), ...winFxNightly),
        path.join('c:', ...winProgramFiles.slice(1), ...winFxNightlyAlt),
        path.join('c:', ...winProgramFilesX86.slice(1), ...winFxNightlyAlt),
        path.join('d:', ...winProgramFiles.slice(1), ...winFxNightlyAlt),
        path.join('d:', ...winProgramFilesX86.slice(1), ...winFxNightlyAlt),
        path.join('z:', ...winProgramFiles.slice(1), ...winFxNightlyAlt),
        path.join('z:', ...winProgramFilesX86.slice(1), ...winFxNightlyAlt),
        path.join('c:', ...winProgramFiles.slice(1), ...winFxDev),
        path.join('c:', ...winProgramFilesX86.slice(1), ...winFxDev),
        path.join('d:', ...winProgramFiles.slice(1), ...winFxDev),
        path.join('d:', ...winProgramFilesX86.slice(1), ...winFxDev),
        path.join('z:', ...winProgramFiles.slice(1), ...winFxDev),
        path.join('z:', ...winProgramFilesX86.slice(1), ...winFxDev),
        path.join('c:', ...winProgramFiles.slice(1), ...winFx),
        path.join('c:', ...winProgramFilesX86.slice(1), ...winFx),
        path.join('d:', ...winProgramFiles.slice(1), ...winFx),
        path.join('d:', ...winProgramFilesX86.slice(1), ...winFx),
        path.join('z:', ...winProgramFiles.slice(1), ...winFx),
        path.join('z:', ...winProgramFilesX86.slice(1), ...winFx),
      ])
    })

    it('throws error if no executable path is found', async () => {
      process.env.PROGRAMFILES = ''
      process.env['PROGRAMFILES(X86)'] = ''

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await expect(firefoxFinder({})).rejects.toThrow(CLIError)

      expect(findExecutableSpy).toHaveBeenCalledWith([])
    })
  })

  describe('with WSL1', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      jest.resetModules()

      jest.spyOn(utils, 'getPlatform').mockResolvedValue('wsl1')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) => p === '/mnt/c/Program Files/Mozilla Firefox/firefox.exe'
        )

      process.env = { ...originalEnv, PATH: undefined }
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const edge = await firefoxFinder({})

      expect(edge).toStrictEqual({
        path: '/mnt/c/Program Files/Mozilla Firefox/firefox.exe',
        acceptedBrowsers: [FirefoxBrowser],
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.posix.join('/mnt/c/Program Files', ...winFxNightly),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFxNightly),
        path.posix.join('/mnt/c/Program Files', ...winFxNightlyAlt),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFxNightlyAlt),
        path.posix.join('/mnt/c/Program Files', ...winFxDev),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFxDev),
        path.posix.join('/mnt/c/Program Files', ...winFx),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFx),
      ])
    })

    it('finds from detected drives when the PATH environment has paths starting with any drive letters', async () => {
      process.env.PATH = '/mnt/z/Mock:/mnt/d/Mock:/mnt/d/Mock/Mock'

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await firefoxFinder({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.posix.join('/mnt/c/Program Files', ...winFxNightly),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFxNightly),
        path.posix.join('/mnt/d/Program Files', ...winFxNightly),
        path.posix.join('/mnt/d/Program Files (x86)', ...winFxNightly),
        path.posix.join('/mnt/z/Program Files', ...winFxNightly),
        path.posix.join('/mnt/z/Program Files (x86)', ...winFxNightly),
        path.posix.join('/mnt/c/Program Files', ...winFxNightlyAlt),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFxNightlyAlt),
        path.posix.join('/mnt/d/Program Files', ...winFxNightlyAlt),
        path.posix.join('/mnt/d/Program Files (x86)', ...winFxNightlyAlt),
        path.posix.join('/mnt/z/Program Files', ...winFxNightlyAlt),
        path.posix.join('/mnt/z/Program Files (x86)', ...winFxNightlyAlt),
        path.posix.join('/mnt/c/Program Files', ...winFxDev),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFxDev),
        path.posix.join('/mnt/d/Program Files', ...winFxDev),
        path.posix.join('/mnt/d/Program Files (x86)', ...winFxDev),
        path.posix.join('/mnt/z/Program Files', ...winFxDev),
        path.posix.join('/mnt/z/Program Files (x86)', ...winFxDev),
        path.posix.join('/mnt/c/Program Files', ...winFx),
        path.posix.join('/mnt/c/Program Files (x86)', ...winFx),
        path.posix.join('/mnt/d/Program Files', ...winFx),
        path.posix.join('/mnt/d/Program Files (x86)', ...winFx),
        path.posix.join('/mnt/z/Program Files', ...winFx),
        path.posix.join('/mnt/z/Program Files (x86)', ...winFx),
      ])
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(firefoxFinder({})).rejects.toThrow(CLIError)
    })
  })
})

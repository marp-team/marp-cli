import path from 'node:path'
import which from 'which'
import { CLIError } from '../../src/error'
import { findSOffice } from '../../src/soffice/finder'
import * as utils from '../../src/utils/finder'

jest.mock('which')

const mockedWhich = jest.mocked(which<{ nothrow: true }>)

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
  mockedWhich.mockReset()
  mockedWhich.mockRestore()
})

const sofficePathRest = ['LibreOffice', 'program', 'soffice.exe']
const sofficeScoopPathRest = [
  'scoop',
  'apps',
  'libreoffice',
  'current',
  ...sofficePathRest,
]

const itExceptWin = process.platform === 'win32' ? it.skip : it

const executableMock = (name: string) =>
  path.join(__dirname, `../utils/_executable_mocks`, name)

describe('SOffice finder', () => {
  describe('with preferred path', () => {
    it('returns the preferred path as edge', async () => {
      const soffice = await findSOffice({
        preferredPath: '/test/preferred/soffice',
      })

      expect(soffice).toStrictEqual({
        path: '/test/preferred/soffice',
      })
    })
  })

  describe('with SOFFICE_PATH environment variable', () => {
    const originalEnv = { ...process.env }
    const regularResolution = new Error('Starting regular resolution')

    beforeEach(() => {
      jest.resetModules()
      jest.spyOn(utils, 'getPlatform').mockRejectedValue(regularResolution)
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('return the path for executable specified in SOFFICE_PATH', async () => {
      process.env.SOFFICE_PATH = executableMock('empty')

      expect(await findSOffice({})).toStrictEqual({
        path: process.env.SOFFICE_PATH,
      })
    })

    itExceptWin(
      'processes regular resolution if SOFFICE_PATH is not executable',
      async () => {
        process.env.SOFFICE_PATH = executableMock('non-executable')

        await expect(findSOffice({})).rejects.toThrow(regularResolution)
      }
    )

    it('processes regular resolution if SOFFICE_PATH is not found', async () => {
      process.env.SOFFICE_PATH = executableMock('not-found')

      await expect(findSOffice({})).rejects.toThrow(regularResolution)
    })

    it('prefers the preferred path over SOFFICE_PATH', async () => {
      process.env.SOFFICE_PATH = executableMock('empty')

      expect(
        await findSOffice({ preferredPath: '/test/preferred/soffice' })
      ).toStrictEqual({
        path: '/test/preferred/soffice',
      })
    })
  })

  describe('with Linux', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('linux')
    })

    it('finds possible binaries from PATH by using which command, and return resolved path', async () => {
      mockedWhich.mockImplementation(async (command) => {
        if (command === 'soffice') return executableMock('empty')
        return null
      })

      const soffice = await findSOffice({})

      expect(soffice).toStrictEqual({ path: executableMock('empty') })
      expect(which).toHaveBeenCalledWith('soffice', { nothrow: true })
    })

    it('throws error if the path was not resolved', async () => {
      mockedWhich.mockResolvedValue(null)

      await expect(findSOffice({})).rejects.toThrow(CLIError)
      expect(which).toHaveBeenCalled()
    })

    it('throws error if the which command has rejected by error', async () => {
      mockedWhich.mockRejectedValue(new Error('Unexpected error'))

      await expect(findSOffice({})).rejects.toThrow(CLIError)
      expect(which).toHaveBeenCalled()
    })
  })

  describe('with macOS', () => {
    beforeEach(() => {
      jest.spyOn(utils, 'getPlatform').mockResolvedValue('darwin')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(
          async (p) =>
            p === '/Applications/LibreOffice.app/Contents/MacOS/soffice'
        )
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const soffice = await findSOffice({})

      expect(soffice).toStrictEqual({
        path: '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      ])
    })

    it('throws error if no executable path is found', async () => {
      jest.spyOn(utils, 'isExecutable').mockResolvedValue(false)
      await expect(findSOffice({})).rejects.toThrow(CLIError)
    })
  })

  describe('with Windows', () => {
    const winProgramFiles = ['c:', 'Mock', 'Program Files']
    const winProgramFilesX86 = ['c:', 'Mock', 'Program Files (x86)']
    const winUserProfile = ['c:', 'Mock', 'Users', 'user']
    const winAllUsersProfile = ['c:', 'Mock', 'ProgramData']
    const sofficePath = path.join(...winProgramFiles, ...sofficePathRest)

    const originalEnv = { ...process.env }

    beforeEach(() => {
      jest.resetModules()

      jest.spyOn(utils, 'getPlatform').mockResolvedValue('win32')
      jest
        .spyOn(utils, 'isExecutable')
        .mockImplementation(async (p) => p === sofficePath)

      process.env = {
        ...originalEnv,
        PATH: undefined,
        PROGRAMFILES: path.join(...winProgramFiles),
        'PROGRAMFILES(X86)': path.join(...winProgramFilesX86),
        USERPROFILE: path.join(...winUserProfile),
        ALLUSERSPROFILE: path.join(...winAllUsersProfile),
      }
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('finds possible executable path and returns the matched path', async () => {
      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      const soffice = await findSOffice({})

      expect(soffice).toStrictEqual({ path: sofficePath })
      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join(...winProgramFiles, ...sofficePathRest),
        path.join(...winProgramFilesX86, ...sofficePathRest),

        // Scoop
        path.join(...winUserProfile, ...sofficeScoopPathRest),
        path.join(...winAllUsersProfile, ...sofficeScoopPathRest),
      ])
    })

    it('skips inaccessible directories to find', async () => {
      process.env['PROGRAMFILES(X86)'] = '' // No WOW64

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await findSOffice({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join(...winProgramFiles, ...sofficePathRest),
        path.join(...winUserProfile, ...sofficeScoopPathRest),
        path.join(...winAllUsersProfile, ...sofficeScoopPathRest),
      ])
    })

    it('finds from detected drives when the PATH environment has paths starting with any drive letters', async () => {
      process.env.PATH = 'z:\\Mock;D:\\Mock;d:\\Mock\\Mock;'

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await findSOffice({})

      expect(findExecutableSpy).toHaveBeenCalledWith([
        path.join('c:', ...winProgramFiles.slice(1), ...sofficePathRest),
        path.join('c:', ...winProgramFilesX86.slice(1), ...sofficePathRest),
        path.join('d:', ...winProgramFiles.slice(1), ...sofficePathRest),
        path.join('d:', ...winProgramFilesX86.slice(1), ...sofficePathRest),
        path.join('z:', ...winProgramFiles.slice(1), ...sofficePathRest),
        path.join('z:', ...winProgramFilesX86.slice(1), ...sofficePathRest),
        path.join(...winUserProfile, ...sofficeScoopPathRest),
        path.join(...winAllUsersProfile, ...sofficeScoopPathRest),
      ])
    })

    it('throws error if no executable path is found', async () => {
      process.env.PROGRAMFILES = ''
      process.env['PROGRAMFILES(X86)'] = ''
      process.env.USERPROFILE = ''
      process.env.ALLUSERSPROFILE = ''

      const findExecutableSpy = jest.spyOn(utils, 'findExecutable')
      await expect(findSOffice({})).rejects.toThrow(CLIError)

      expect(findExecutableSpy).toHaveBeenCalledWith([])
    })
  })
})

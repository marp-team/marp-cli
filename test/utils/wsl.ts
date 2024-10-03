import childProcess from 'node:child_process'
import fs from 'node:fs'

jest.mock('is-wsl')

const wsl = (): typeof import('../../src/utils/wsl') =>
  require('../../src/utils/wsl') // eslint-disable-line @typescript-eslint/no-require-imports

beforeEach(() => jest.resetModules())
afterEach(() => jest.restoreAllMocks())

describe('#translateWSLPathToWindows', () => {
  it('resolves WSL path to Windows path by running wslpath', async () => {
    expect.assertions(3)

    jest
      .spyOn(childProcess, 'execFile')
      .mockImplementation((fn, args, cb: any): any => {
        expect(fn).toBe('wslpath')
        expect(args).toStrictEqual(['-m', '/mnt/c/Users/foo/bar'])
        cb(null, { stdout: '\nC:\\Users\\foo\\bar\n', stderr: '' })
      })

    expect(await wsl().translateWSLPathToWindows('/mnt/c/Users/foo/bar')).toBe(
      'C:\\Users\\foo\\bar'
    )
  })
})

describe('#translateWindowsPathToWSL', () => {
  it('resolves Windows path to WSL path by running wslpath', async () => {
    expect.assertions(3)

    jest
      .spyOn(childProcess, 'execFile')
      .mockImplementation((fn, args, cb: any): any => {
        expect(fn).toBe('wslpath')
        expect(args).toStrictEqual(['-u', 'C:\\Users\\foo\\bar'])
        cb(null, { stdout: '\n/mnt/c/Users/foo/bar\n', stderr: '' })
      })

    expect(await wsl().translateWindowsPathToWSL('C:\\Users\\foo\\bar')).toBe(
      '/mnt/c/Users/foo/bar'
    )
  })
})

describe('#getWindowsEnv', () => {
  it('resolves Windows environment value by running cmd.exe', async () => {
    expect.assertions(6)

    jest
      .spyOn(childProcess, 'execFile')
      .mockImplementation((fn, args, cb: any): any => {
        expect(fn).toBe('cmd.exe')
        expect(args).toStrictEqual(['/c', 'SET', expect.any(String)])
        cb(null, { stdout: '\nTMP=123\n', stderr: '' })
      })

    expect(await wsl().getWindowsEnv('TMP')).toBe('123')
    expect(await wsl().getWindowsEnv('XXX')).toBeUndefined()
  })
})

describe('#isWSL', () => {
  let originalWSLDistroName: string | undefined
  let originalWSLInterop: string | undefined

  beforeEach(() => {
    originalWSLDistroName = process.env.WSL_DISTRO_NAME
    originalWSLInterop = process.env.WSL_INTEROP

    process.env.WSL_DISTRO_NAME = ''
    process.env.WSL_INTEROP = ''
  })

  afterEach(() => {
    process.env.WSL_DISTRO_NAME = originalWSLDistroName
    process.env.WSL_INTEROP = originalWSLInterop

    jest.dontMock('is-wsl')
  })

  it('returns 0 if is-wsl module returned false', async () => {
    jest.doMock('is-wsl', () => false)

    expect(await wsl().isWSL()).toBe(0)
  })

  it('returns 1 if running on WSL 1', async () => {
    jest.doMock('is-wsl', () => true)

    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(
        'Linux version 4.5.6-12345-Microsoft (gcc version 5.4.0 (GCC) )'
      )

    expect(await wsl().isWSL()).toBe(1)
    expect(readFile).toHaveBeenCalledTimes(1)

    // Returns cached result to prevent excessive file I/O
    await wsl().isWSL()
    expect(readFile).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2 (Fast check by environment values)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFile = jest.spyOn(fs.promises, 'readFile')

    // WSL 2 has WSL_DISTRO_NAME and WSL_INTEROP
    process.env.WSL_DISTRO_NAME = 'Ubuntu'
    process.env.WSL_INTEROP = '/run/WSL/11_interop'

    expect(await wsl().isWSL()).toBe(2)
    expect(readFile).not.toHaveBeenCalled()
  })

  it('returns 2 if running on WSL 2 (Check WSL2 annotation in /proc/version string)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue('Linux version 4.5.6-Microsoft-Standard-WSL2')

    expect(await wsl().isWSL()).toBe(2)
    expect(readFile).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2 (Check gcc version in /proc/version string)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(
        'Linux version 4.5.6-12345-Microsoft (gcc version 8.4.0 (GCC) )'
      )

    expect(await wsl().isWSL()).toBe(2)
    expect(readFile).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2 (The latest format of /proc/version string)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(
        'Linux version 5.10.74.3 (x86_64-msft-linux-gcc (GCC) 9.3.0, GNU ld (GNU Binutils) 2.34.0.20200220)'
      )

    expect(await wsl().isWSL()).toBe(2)
    expect(readFile).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if throing an error while checking WSL 2 because 2 is the primary version of current WSL', async () => {
    jest.doMock('is-wsl', () => true)

    const readFile = jest
      .spyOn(fs.promises, 'readFile')
      .mockRejectedValue(new Error('Failed to read file'))

    expect(await wsl().isWSL()).toBe(2)
    expect(readFile).toHaveBeenCalledTimes(1)
  })
})

import childProcess from 'child_process'
import fs from 'fs'

jest.mock('is-wsl')

const wsl = (): typeof import('../../src/utils/wsl') =>
  require('../../src/utils/wsl')

beforeEach(() => jest.resetModules())
afterEach(() => jest.restoreAllMocks())

describe('#resolveWSLPathToHost', () => {
  it('resolves WSL path to Windows path by running wslpath', async () => {
    expect.assertions(3)

    jest
      .spyOn(childProcess, 'execFile')
      .mockImplementation((fn, args, cb: any): any => {
        expect(fn).toBe('wslpath')
        expect(args).toStrictEqual(['-m', '/mnt/c/Users/foo/bar'])
        cb(null, '\nC:/Users/foo/bar\n', '')
      })

    expect(await wsl().resolveWSLPathToHost('/mnt/c/Users/foo/bar')).toBe(
      'C:/Users/foo/bar'
    )
  })
})

describe('#resolveWSLPathToGuestSync', () => {
  it('resolves Windows path to WSL path by running wslpath', () => {
    expect.assertions(3)

    jest
      .spyOn(childProcess, 'spawnSync')
      .mockImplementation((fn, args): any => {
        expect(fn).toBe('wslpath')
        expect(args).toStrictEqual(['-u', 'C:\\Users\\foo\\bar'])

        return { stdout: '\n/mnt/c/Users/foo/bar\n' }
      })

    expect(wsl().resolveWSLPathToGuestSync('C:\\Users\\foo\\bar')).toBe(
      '/mnt/c/Users/foo/bar'
    )
  })
})

describe('#resolveWindowsEnv', () => {
  it('resolves Windows environment value by running cmd.exe', async () => {
    expect.assertions(6)

    jest
      .spyOn(childProcess, 'execFile')
      .mockImplementation((fn, args, cb: any): any => {
        expect(fn).toBe('cmd.exe')
        expect(args).toStrictEqual(['/c', 'SET', expect.any(String)])
        cb(null, '\nTMP=123\n', '')
      })

    expect(await wsl().resolveWindowsEnv('TMP')).toBe('123')
    expect(await wsl().resolveWindowsEnv('XXX')).toBeUndefined()
  })
})

describe('#resolveWindowsEnvSync', () => {
  it('resolves Windows environment value by running cmd.exe', () => {
    expect.assertions(6)

    jest
      .spyOn(childProcess, 'spawnSync')
      .mockImplementation((fn, args): any => {
        expect(fn).toBe('cmd.exe')
        expect(args).toStrictEqual(['/c', 'SET', expect.any(String)])

        return { stdout: '\nTMP=123\n' }
      })

    expect(wsl().resolveWindowsEnvSync('TMP')).toBe('123')
    expect(wsl().resolveWindowsEnvSync('XXX')).toBeUndefined()
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

    const readFileSync = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(
        () => 'Linux version 4.5.6-12345-Microsoft (gcc version 5.4.0 (GCC) )'
      )

    expect(await wsl().isWSL()).toBe(1)
    expect(readFileSync).toHaveBeenCalledTimes(1)

    // Returns cached result to prevent excessive file I/O
    await wsl().isWSL()
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2 (Fast check by environment values)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFileSync = jest.spyOn(fs, 'readFileSync')

    // WSL 2 has WSL_DISTRO_NAME and WSL_INTEROP
    process.env.WSL_DISTRO_NAME = 'Ubuntu'
    process.env.WSL_INTEROP = '/run/WSL/11_interop'

    expect(await wsl().isWSL()).toBe(2)
    expect(readFileSync).not.toHaveBeenCalled()
  })

  it('returns 2 if running on WSL 2 (Check WSL2 annotation in /proc/version string)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFileSync = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => 'Linux version 4.5.6-Microsoft-Standard-WSL2')

    expect(await wsl().isWSL()).toBe(2)
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2 (Check gcc version in /proc/version string)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFileSync = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(
        () => 'Linux version 4.5.6-12345-Microsoft (gcc version 8.4.0 (GCC) )'
      )

    expect(await wsl().isWSL()).toBe(2)
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2 (The latest format of /proc/version string)', async () => {
    jest.doMock('is-wsl', () => true)

    const readFileSync = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(
        () =>
          'Linux version 5.10.74.3 (x86_64-msft-linux-gcc (GCC) 9.3.0, GNU ld (GNU Binutils) 2.34.0.20200220)'
      )

    expect(await wsl().isWSL()).toBe(2)
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })
})

describe('#isChromeInWSLHost', () => {
  it('returns true if executed in WSL environment and the passed path is in WSL host', async () => {
    const isWSL = jest.spyOn(wsl(), 'isWSL')
    const { isChromeInWSLHost } = wsl()

    isWSL.mockResolvedValue(1)
    expect(await isChromeInWSLHost('/mnt/c/Programs/Chrome/chrome.exe')).toBe(
      true
    )
    expect(await isChromeInWSLHost('/mnt/d/foo/bar/chrome')).toBe(true)
    expect(await isChromeInWSLHost('/usr/bin/chrome')).toBe(false)
    expect(await isChromeInWSLHost('/home/test/.chromium/chrome.exe')).toBe(
      false
    )
    expect(await isChromeInWSLHost(undefined)).toBe(false)

    isWSL.mockResolvedValue(0)
    expect(await isChromeInWSLHost('/mnt/c/Programs/Chrome/chrome.exe')).toBe(
      false
    )
    expect(await isChromeInWSLHost('/mnt/d/foo/bar/chrome')).toBe(false)
  })
})

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
  afterEach(() => jest.dontMock('is-wsl'))

  it('returns 0 if is-wsl module returned false', () => {
    jest.doMock('is-wsl', () => false)
    expect(wsl().isWSL()).toBe(0)
  })

  it('returns 1 if running on WSL 1', () => {
    jest.doMock('is-wsl', () => true)

    const readFileSync = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => '4.19.128-microsoft-standard')

    expect(wsl().isWSL()).toBe(1)
    expect(readFileSync).toHaveBeenCalledTimes(1)

    // Returns cached result to prevent excessive file I/O
    wsl().isWSL()
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })

  it('returns 2 if running on WSL 2', () => {
    jest.doMock('is-wsl', () => true)

    // https://github.com/microsoft/WSL/issues/423#issuecomment-611086412
    jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => '4.19.128-microsoft-WSL2-standard')

    expect(wsl().isWSL()).toBe(2)
  })
})

describe('#isChromeInWSLHost', () => {
  it('returns true if executed in WSL environment and the passed path is in WSL host', () => {
    const isWSL = jest.spyOn(wsl(), 'isWSL')
    const { isChromeInWSLHost } = wsl()

    isWSL.mockImplementation(() => 1)
    expect(isChromeInWSLHost('/mnt/c/Programs/Chrome/chrome.exe')).toBe(true)
    expect(isChromeInWSLHost('/mnt/d/foo/bar/chrome')).toBe(true)
    expect(isChromeInWSLHost('/usr/bin/chrome')).toBe(false)
    expect(isChromeInWSLHost('/home/test/.chromium/chrome.exe')).toBe(false)
    expect(isChromeInWSLHost(undefined)).toBe(false)

    isWSL.mockImplementation(() => 0)
    expect(isChromeInWSLHost('/mnt/c/Programs/Chrome/chrome.exe')).toBe(false)
    expect(isChromeInWSLHost('/mnt/d/foo/bar/chrome')).toBe(false)
  })
})

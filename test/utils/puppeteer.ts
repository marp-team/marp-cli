import os from 'os'
import path from 'path'
import { CLIErrorCode } from '../../src/error'

jest.mock('../../src/utils/chrome-finder')
jest.mock('../../src/utils/edge-finder')
jest.mock('../../src/utils/wsl')

const CLIError = (): typeof import('../../src/error').CLIError =>
  require('../../src/error').CLIError // eslint-disable-line @typescript-eslint/no-var-requires

const puppeteer = (): typeof import('../../src/utils/puppeteer') =>
  require('../../src/utils/puppeteer')

const chromeFinder = (): typeof import('../../src/utils/chrome-finder') =>
  require('../../src/utils/chrome-finder')

const edgeFinder = (): typeof import('../../src/utils/edge-finder') =>
  require('../../src/utils/edge-finder')

const wsl = (): typeof import('../../src/utils/wsl') =>
  require('../../src/utils/wsl')

beforeEach(() => jest.resetModules())
afterEach(() => jest.restoreAllMocks())

describe('#generatePuppeteerDataDirPath', () => {
  it('returns data dir path for OS specific temporary directory', async () => {
    const dataDir = await puppeteer().generatePuppeteerDataDirPath('tmp-name')
    expect(dataDir).toBe(path.resolve(os.tmpdir(), 'tmp-name'))
  })

  describe('with wslPath option', () => {
    it('returns regular path if the current environment is not WSL', async () => {
      expect(
        await puppeteer().generatePuppeteerDataDirPath('tmp-name', {
          wslHost: true,
        })
      ).toBe(await puppeteer().generatePuppeteerDataDirPath('tmp-name'))
    })

    it('resolves tmpdir for Windows and returns data dir path for resolved directory', async () => {
      jest.spyOn(wsl(), 'isWSL').mockImplementation(() => 1)

      const resolveWindowsEnv = jest
        .spyOn(wsl(), 'resolveWindowsEnv')
        .mockResolvedValue('C:\\Test\\Tmp')

      const dataDir = await puppeteer().generatePuppeteerDataDirPath(
        'tmp-name',
        { wslHost: true }
      )

      expect(resolveWindowsEnv).toHaveBeenCalledWith('TMP')
      expect(dataDir).toBe('C:\\Test\\Tmp\\tmp-name')
    })
  })
})

describe('#generatePuppeteerLaunchArgs', () => {
  it('finds out installed Chrome through chrome finder', () => {
    const getFirstInstallation = jest
      .spyOn(chromeFinder(), 'findChromeInstallation')
      .mockImplementation(() => '/usr/bin/chromium')

    const args = puppeteer().generatePuppeteerLaunchArgs()
    expect(args.executablePath).toBe('/usr/bin/chromium')
    expect(getFirstInstallation).toHaveBeenCalledTimes(1)

    // Cache found result
    puppeteer().generatePuppeteerLaunchArgs()
    expect(getFirstInstallation).toHaveBeenCalledTimes(1)
  })

  it('finds out installed Edge as the fallback if not found Chrome', () => {
    jest.spyOn(chromeFinder(), 'findChromeInstallation').mockImplementation()
    jest
      .spyOn(edgeFinder(), 'findEdgeInstallation')
      .mockImplementation(() => '/usr/bin/msedge')

    const args = puppeteer().generatePuppeteerLaunchArgs()
    expect(args.executablePath).toBe('/usr/bin/msedge')
    expect(edgeFinder().findEdgeInstallation).toHaveBeenCalledTimes(1)
  })

  it('throws CLIError with specific error code if not found executable path', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()

    jest
      .spyOn(chromeFinder(), 'findChromeInstallation')
      .mockImplementation(() => {
        throw new Error('Error in chrome finder')
      })
    jest.spyOn(edgeFinder(), 'findEdgeInstallation').mockImplementation()

    expect(puppeteer().generatePuppeteerLaunchArgs).toThrow(
      new (CLIError())(
        'You have to install Google Chrome, Chromium, or Microsoft Edge to convert slide deck with current options.',
        CLIErrorCode.NOT_FOUND_CHROMIUM
      )
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Error in chrome finder')
    )
  })

  it('uses custom executable path if CHROME_PATH environment value was defined as executable path', () => {
    jest.dontMock('../../src/utils/chrome-finder')

    try {
      process.env.CHROME_PATH = path.resolve(__dirname, '../../marp-cli.js')

      const args = puppeteer().generatePuppeteerLaunchArgs()
      expect(args.executablePath).toBe(process.env.CHROME_PATH)
    } finally {
      delete process.env.CHROME_PATH
    }
  })

  it('uses specific settings if running in the official Docker image', () => {
    try {
      process.env.IS_DOCKER = 'true'

      const args = puppeteer().generatePuppeteerLaunchArgs()
      expect(args.executablePath).toBe('/usr/bin/chromium-browser')
      expect(args.args).toContain('--no-sandbox')
      expect(args.args).toContain('--disable-features=VizDisplayCompositor')
    } finally {
      delete process.env.IS_DOCKER
    }
  })

  it("ignores puppeteer's --disable-extensions option if defined CHROME_ENABLE_EXTENSIONS environment value", () => {
    try {
      process.env.CHROME_ENABLE_EXTENSIONS = 'true'

      const args = puppeteer().generatePuppeteerLaunchArgs()
      expect(args.ignoreDefaultArgs).toContain('--disable-extensions')
    } finally {
      delete process.env.CHROME_ENABLE_EXTENSIONS
    }
  })
})

import path from 'path'
import { CLIErrorCode } from '../../src/error'

jest.mock('chrome-launcher')
jest.mock('../../src/utils/edge-finder')

const Launcher = (): typeof import('chrome-launcher').Launcher =>
  require('chrome-launcher').Launcher // eslint-disable-line @typescript-eslint/no-var-requires

const CLIError = (): typeof import('../../src/error').CLIError =>
  require('../../src/error').CLIError // eslint-disable-line @typescript-eslint/no-var-requires

const puppeteer = (): typeof import('../../src/utils/puppeteer') =>
  require('../../src/utils/puppeteer')

const edgeFinder = (): typeof import('../../src/utils/edge-finder') =>
  require('../../src/utils/edge-finder')

beforeEach(() => jest.resetModules())
afterEach(() => jest.restoreAllMocks())

describe('#generatePuppeteerLaunchArgs', () => {
  it('finds out installed Chrome through chrome-launcher', () => {
    const getFirstInstallation = jest
      .spyOn(Launcher(), 'getFirstInstallation')
      .mockImplementation(() => '/usr/bin/chromium')

    const args = puppeteer().generatePuppeteerLaunchArgs()
    expect(args.executablePath).toBe('/usr/bin/chromium')
    expect(getFirstInstallation).toHaveBeenCalledTimes(1)

    // Cache found result
    puppeteer().generatePuppeteerLaunchArgs()
    expect(getFirstInstallation).toHaveBeenCalledTimes(1)
  })

  it('finds out installed Edge as the fallback if not found Chrome', () => {
    jest.spyOn(Launcher(), 'getFirstInstallation').mockImplementation()
    jest
      .spyOn(edgeFinder(), 'findEdgeInstallation')
      .mockImplementation(() => '/usr/bin/msedge')

    const args = puppeteer().generatePuppeteerLaunchArgs()
    expect(args.executablePath).toBe('/usr/bin/msedge')
    expect(edgeFinder().findEdgeInstallation).toHaveBeenCalledTimes(1)
  })

  it('throws CLIError with specific error code if not found executable path', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()

    jest.spyOn(Launcher(), 'getFirstInstallation').mockImplementation(() => {
      throw new Error('Error in chrome-launcher')
    })
    jest.spyOn(edgeFinder(), 'findEdgeInstallation').mockImplementation()

    expect(puppeteer().generatePuppeteerLaunchArgs).toThrow(
      new (CLIError())(
        'You have to install Google Chrome or Chromium to convert slide deck with current options.',
        CLIErrorCode.NOT_FOUND_CHROMIUM
      )
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Error in chrome-launcher')
    )
  })

  it('uses custom executable path if CHROME_PATH environment value was defined as executable path', () => {
    jest.dontMock('chrome-launcher')

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

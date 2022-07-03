import os from 'os'
import path from 'path'
import { CLIErrorCode } from '../../src/error'

jest.mock('../../src/utils/chrome-finder')
jest.mock('../../src/utils/edge-finder')
jest.mock('../../src/utils/wsl')

const CLIError = (): typeof import('../../src/error').CLIError =>
  require('../../src/error').CLIError // eslint-disable-line @typescript-eslint/no-var-requires

const puppeteer = (): typeof import('puppeteer-core') =>
  require('puppeteer-core')

const puppeteerUtils = (): typeof import('../../src/utils/puppeteer') =>
  require('../../src/utils/puppeteer')

const chromeFinder = (): typeof import('../../src/utils/chrome-finder') =>
  require('../../src/utils/chrome-finder')

const docker = (): typeof import('../../src/utils/docker') =>
  require('../../src/utils/docker')

const edgeFinder = (): typeof import('../../src/utils/edge-finder') =>
  require('../../src/utils/edge-finder')

const wsl = (): typeof import('../../src/utils/wsl') =>
  require('../../src/utils/wsl')

beforeEach(() => jest.resetModules())
afterEach(() => jest.restoreAllMocks())

describe('#generatePuppeteerDataDirPath', () => {
  let mkdirSpy: jest.SpyInstance

  beforeEach(async () => {
    const { promises } = await import('fs')

    mkdirSpy = jest.spyOn(promises, 'mkdir')
    mkdirSpy.mockImplementation(() => Promise.resolve(undefined))
  })

  it('returns the path of created data dir for OS specific temporary directory', async () => {
    const dataDir = await puppeteerUtils().generatePuppeteerDataDirPath(
      'tmp-name'
    )
    const expectedDir = path.resolve(os.tmpdir(), 'tmp-name')

    expect(dataDir).toBe(expectedDir)
    expect(mkdirSpy).toHaveBeenCalledWith(expectedDir, { recursive: true })
  })

  it('ignores EEXIST error thrown by mkdir', async () => {
    // EEXIST error
    mkdirSpy.mockRejectedValueOnce(
      Object.assign(new Error('EEXIST'), { code: 'EEXIST' })
    )

    await expect(
      puppeteerUtils().generatePuppeteerDataDirPath('tmp-name')
    ).resolves.toStrictEqual(expect.any(String))

    // Regular error
    const err = new Error('Regular error')
    mkdirSpy.mockRejectedValueOnce(err)

    await expect(
      puppeteerUtils().generatePuppeteerDataDirPath('tmp-name')
    ).rejects.toBe(err)
  })

  describe('with wslPath option', () => {
    it('returns regular path if the current environment is not WSL', async () => {
      expect(
        await puppeteerUtils().generatePuppeteerDataDirPath('tmp-name', {
          wslHost: true,
        })
      ).toBe(await puppeteerUtils().generatePuppeteerDataDirPath('tmp-name'))
    })

    it('resolves tmpdir for Windows and returns data dir path for resolved directory', async () => {
      jest.spyOn(wsl(), 'isWSL').mockImplementation(() => 1)

      const resolveWindowsEnv = jest
        .spyOn(wsl(), 'resolveWindowsEnv')
        .mockResolvedValue('C:\\Test\\Tmp')

      const dataDir = await puppeteerUtils().generatePuppeteerDataDirPath(
        'tmp-name',
        { wslHost: true }
      )

      expect(resolveWindowsEnv).toHaveBeenCalledWith('TMP')
      expect(dataDir).toBe('C:\\Test\\Tmp\\tmp-name')
    })
  })
})

describe('#generatePuppeteerLaunchArgs', () => {
  it('finds out installed Chrome through chrome finder', async () => {
    const getFirstInstallation = jest
      .spyOn(chromeFinder(), 'findChromeInstallation')
      .mockResolvedValue('/usr/bin/chromium')

    const args = await puppeteerUtils().generatePuppeteerLaunchArgs()
    expect(args.executablePath).toBe('/usr/bin/chromium')
    expect(getFirstInstallation).toHaveBeenCalledTimes(1)

    // Cache found result
    await puppeteerUtils().generatePuppeteerLaunchArgs()
    expect(getFirstInstallation).toHaveBeenCalledTimes(1)
  })

  it('finds out installed Edge as the fallback if not found Chrome', async () => {
    jest.spyOn(chromeFinder(), 'findChromeInstallation').mockImplementation()
    jest
      .spyOn(edgeFinder(), 'findEdgeInstallation')
      .mockImplementation(() => '/usr/bin/msedge')

    const args = await puppeteerUtils().generatePuppeteerLaunchArgs()
    expect(args.executablePath).toBe('/usr/bin/msedge')
    expect(edgeFinder().findEdgeInstallation).toHaveBeenCalledTimes(1)
  })

  it('throws CLIError with specific error code if not found executable path', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()

    jest
      .spyOn(chromeFinder(), 'findChromeInstallation')
      .mockImplementation(() => {
        throw new Error('Error in chrome finder')
      })
    jest.spyOn(edgeFinder(), 'findEdgeInstallation').mockImplementation()

    await expect(puppeteerUtils().generatePuppeteerLaunchArgs).rejects.toThrow(
      new (CLIError())(
        'You have to install Google Chrome, Chromium, or Microsoft Edge to convert slide deck with current options.',
        CLIErrorCode.NOT_FOUND_CHROMIUM
      )
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Error in chrome finder')
    )
  })

  it('uses custom executable path if CHROME_PATH environment value was defined as executable path', async () => {
    jest.dontMock('../../src/utils/chrome-finder')

    try {
      process.env.CHROME_PATH = path.resolve(__dirname, '../../marp-cli.js')

      const args = await puppeteerUtils().generatePuppeteerLaunchArgs()
      expect(args.executablePath).toBe(process.env.CHROME_PATH)
    } finally {
      delete process.env.CHROME_PATH
    }
  })

  it('uses specific settings if running within a Docker container', async () => {
    jest.spyOn(docker(), 'isDocker').mockImplementation(() => true)
    jest
      .spyOn(chromeFinder(), 'findChromeInstallation')
      .mockResolvedValue('/usr/bin/chromium')

    const args = await puppeteerUtils().generatePuppeteerLaunchArgs()
    expect(args.args).toContain('--no-sandbox')
    expect(args.args).toContain('--disable-features=VizDisplayCompositor')
  })

  it("ignores puppeteer's --disable-extensions option if defined CHROME_ENABLE_EXTENSIONS environment value", async () => {
    try {
      process.env.CHROME_ENABLE_EXTENSIONS = 'true'

      const args = await puppeteerUtils().generatePuppeteerLaunchArgs()
      expect(args.ignoreDefaultArgs).toContain('--disable-extensions')
    } finally {
      delete process.env.CHROME_ENABLE_EXTENSIONS
    }
  })
})

describe('#launchPuppeteer', () => {
  let launchSpy: jest.SpyInstance

  beforeEach(() => {
    launchSpy = jest.spyOn(puppeteer(), 'launch').mockImplementation()
  })

  it('delegates to puppeteer.launch', async () => {
    const launchOpts = { headless: true } as const
    await puppeteerUtils().launchPuppeteer(launchOpts)

    expect(launchSpy).toHaveBeenCalledTimes(1)
    expect(launchSpy).toHaveBeenCalledWith(launchOpts)
  })

  describe('when rejected', () => {
    it('rejects with an error occured in delegated puppeteer.launch', async () => {
      const err = new Error('test')
      launchSpy.mockRejectedValue(err)

      await expect(puppeteerUtils().launchPuppeteer()).rejects.toBe(err)
    })

    it('retries to launch with "pipe: false" if rejected with "Target.setDiscoverTargets" when pipe option is enabled', async () => {
      const puppeteerKnownError = new Error(
        'Protocol error (Target.setDiscoverTargets): Target closed.'
      )
      launchSpy.mockRejectedValueOnce(puppeteerKnownError)

      await puppeteerUtils().launchPuppeteer({ pipe: true })
      expect(launchSpy).toHaveBeenCalledTimes(2)
      expect(launchSpy).toHaveBeenNthCalledWith(2, { pipe: false })
    })

    describe('by AppArmor for snapd containment', () => {
      // Simulate spawning error by AppArmor
      const originalError = new Error('need to run as root or suid')

      let originalPlatform: NodeJS.Platform | undefined

      beforeEach(() => {
        originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'linux' })

        launchSpy.mockRejectedValue(originalError)
      })

      afterEach(() => {
        if (originalPlatform) {
          Object.defineProperty(process, 'platform', {
            value: originalPlatform,
          })
        }
      })

      it('rejects CLIError instead of original error if the executable path is snap binary', async () => {
        await expect(
          puppeteerUtils().launchPuppeteer({
            executablePath: '/snap/bin/chromium-browser',
          })
        ).rejects.toMatchInlineSnapshot(
          `[CLIError: Marp CLI has detected trying to spawn Chromium browser installed by snap, from the confined environment like another snap app. At least either of Chrome/Chromium or the shell environment must be non snap app.]`
        )
      })

      it('rejects an original error if the executable path is not snap executable', async () => {
        await expect(
          puppeteerUtils().launchPuppeteer({
            executablePath: path.resolve(__dirname, '_executable_mocks/empty'),
          })
        ).rejects.toBe(originalError)
      })

      it('rejects CLIError if the executable path is shebang script that has included path to snap binary', async () => {
        await expect(
          puppeteerUtils().launchPuppeteer({
            executablePath: path.resolve(
              __dirname,
              '_executable_mocks/shebang-snapd-chromium'
            ),
          })
        ).rejects.toStrictEqual(expect.any(CLIError()))
      })

      it('rejects an original error if the executable path is shebang script that has included path to snap binary', async () => {
        await expect(
          puppeteerUtils().launchPuppeteer({
            executablePath: path.resolve(
              __dirname,
              '_executable_mocks/shebang-chromium'
            ),
          })
        ).rejects.toBe(originalError)
      })
    })
  })
})

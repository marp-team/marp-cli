import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as puppeteer from 'puppeteer-core'
import { ChromeBrowser } from '../../../src/browser/browsers/chrome'
import * as container from '../../../src/utils/container'
import * as wsl from '../../../src/utils/wsl'

jest.mock('puppeteer-core')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('ChromeBrowser', () => {
  describe('#launch', () => {
    beforeEach(() => {
      jest
        .spyOn(puppeteer as any, 'launch')
        .mockResolvedValue({ once: jest.fn() })

      jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)
      jest.spyOn(fs.promises, 'mkdir').mockImplementation()
    })

    it('calls #launch in puppeteer-core', async () => {
      await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          browser: 'chrome',
          protocol: 'webDriverBiDi',
          executablePath: '/path/to/chrome',
        } as const satisfies puppeteer.LaunchOptions)
      )
    })

    it('merges passed options to puppeteer-core', async () => {
      await new ChromeBrowser({ path: '/path/to/chrome' }).launch({
        env: { FOO: 'bar' },
        pipe: false,
        slowMo: 50,
      })

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          env: { FOO: 'bar' },
          pipe: false,
          slowMo: 50,
        })
      )
    })

    describe('Arguments', () => {
      const originalEnv = { ...process.env }

      beforeEach(() => {
        jest.resetModules()
      })

      afterEach(() => {
        process.env = { ...originalEnv }
      })

      it('launches with default arguments', async () => {
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.arrayContaining([
              expect.stringMatching(/^--user-data-dir=/),
            ]),
            ignoreDefaultArgs: [],
          })
        )
      })

      it('launches with merged arguments if args option is passed', async () => {
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch({
          args: ['--foo', '--bar', '--test-type'],
          ignoreDefaultArgs: ['--ignore'],
        })

        // Duplicate arguments should be removed
        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.arrayContaining([
              expect.stringMatching(/^--user-data-dir=/),
              '--test-type',
              '--foo',
              '--bar',
            ]),
            ignoreDefaultArgs: ['--ignore'],
          })
        )
      })

      describe('Disabling sandbox', () => {
        it('adds --disable-sandbox argument if CHROME_NO_SANDBOX environment variable is defined', async () => {
          process.env.CHROME_NO_SANDBOX = '1'
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              args: expect.arrayContaining(['--no-sandbox']),
            })
          )
        })

        it('adds --disable-sandbox argument if running within a container image', async () => {
          jest.spyOn(container, 'isInsideContainer').mockReturnValue(true)
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              args: expect.arrayContaining(['--no-sandbox']),
            })
          )
        })

        it('adds --disable-sandbox argument if running within WSL', async () => {
          jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              args: expect.arrayContaining(['--no-sandbox']),
            })
          )
        })
      })

      describe('Disabling GPU', () => {
        it('does not add --disable-gpu argument if CHROME_DISABLE_GPU environment variable is not defined', async () => {
          delete process.env.CHROME_DISABLE_GPU
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              args: expect.not.arrayContaining(['--disable-gpu']),
            })
          )
        })

        it('adds --disable-gpu argument if CHROME_DISABLE_GPU environment variable is defined', async () => {
          process.env.CHROME_DISABLE_GPU = '1'
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              args: expect.arrayContaining(['--disable-gpu']),
            })
          )
        })
      })

      describe('Disabling extensions', () => {
        it('ignores --disable-extensions argument if CHROME_ENABLE_EXTENSIONS environment variable is defined', async () => {
          process.env.CHROME_ENABLE_EXTENSIONS = '1'
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              ignoreDefaultArgs: expect.arrayContaining([
                '--disable-extensions',
              ]),
            })
          )
        })

        it('does not ignore --disable-extensions argument if CHROME_ENABLE_EXTENSIONS environment variable is empty', async () => {
          process.env.CHROME_ENABLE_EXTENSIONS = ''
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({ ignoreDefaultArgs: [] })
          )
        })

        it('merges ignoreDefaultArgs if passed extra ignore args', async () => {
          process.env.CHROME_ENABLE_EXTENSIONS = 'true'
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch({
            ignoreDefaultArgs: ['--foo', '--bar'],
          })

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              ignoreDefaultArgs: expect.arrayContaining([
                '--disable-extensions',
                '--foo',
                '--bar',
              ]),
            })
          )
        })

        it('ignores all default arguments if explicitly passed ignoreDefaultArgs as true', async () => {
          process.env.CHROME_ENABLE_EXTENSIONS = 'TRUE'
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch({
            ignoreDefaultArgs: true,
          })

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({ ignoreDefaultArgs: true })
          )
        })

        it('keeps ignoring --disable-extensions argument even if explicitly passed ignoreDefaultArgs as false', async () => {
          process.env.CHROME_ENABLE_EXTENSIONS = 'enabled'
          await new ChromeBrowser({ path: '/path/to/chrome' }).launch({
            ignoreDefaultArgs: false,
          })

          expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({
              ignoreDefaultArgs: expect.arrayContaining([
                '--disable-extensions',
              ]),
            })
          )
        })
      })
    })

    describe('Headless mode', () => {
      const originalEnv = { ...process.env }

      beforeEach(() => {
        jest.resetModules()
      })

      afterEach(() => {
        process.env = { ...originalEnv }
      })

      it('launches with default headless mode', async () => {
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: true })
        )
      })

      it('launches with default headless mode if PUPPETEER_HEADLESS_MODE environment variable is empty', async () => {
        process.env.PUPPETEER_HEADLESS_MODE = ''
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: true })
        )
      })

      it('launches with default headless mode if PUPPETEER_HEADLESS_MODE environment variable is unknown value', async () => {
        process.env.PUPPETEER_HEADLESS_MODE = 'unknown'
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: true })
        )
      })

      it('launches with using headless shell if PUPPETEER_HEADLESS_MODE environment variable is "old"', async () => {
        process.env.PUPPETEER_HEADLESS_MODE = 'old'
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: 'shell' })
        )
      })

      it('launches with using headless shell if PUPPETEER_HEADLESS_MODE environment variable is "OLD" (case sensitive)', async () => {
        process.env.PUPPETEER_HEADLESS_MODE = 'OLD'
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: 'shell' })
        )
      })

      it('launches with using headless shell if PUPPETEER_HEADLESS_MODE environment variable is "legacy"', async () => {
        process.env.PUPPETEER_HEADLESS_MODE = 'legacy'
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: 'shell' })
        )
      })

      it('launches with using headless shell if PUPPETEER_HEADLESS_MODE environment variable is "shell"', async () => {
        process.env.PUPPETEER_HEADLESS_MODE = 'shell'
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: 'shell' })
        )
      })
    })

    describe('Pipe', () => {
      const { platform } = process

      beforeEach(() => {
        jest.resetModules()
      })

      afterEach(() => {
        Object.defineProperty(process, 'platform', { value: platform })
      })

      it('launches with enabled pipe', async () => {
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ pipe: true })
        )
      })

      it('retries to launch with using WebSocket if failed to launch with pipe', async () => {
        jest
          .spyOn(puppeteer, 'launch')
          .mockRejectedValueOnce(new Error('Failed'))

        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledTimes(2)
        expect(puppeteer.launch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ pipe: true })
        )
        expect(puppeteer.launch).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ pipe: false })
        )
      })

      it('disables pipe if running on WSL', async () => {
        jest.spyOn(wsl, 'isWSL').mockResolvedValue(2)
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ pipe: false })
        )
      })

      it('disables pipe if detected the snap browser', async () => {
        Object.defineProperty(process, 'platform', { value: 'linux' })
        await new ChromeBrowser({ path: '/snap/bin/chrome' }).launch()

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({ pipe: false })
        )
      })
    })

    describe('Errors', () => {
      const { platform } = process

      beforeEach(() => {
        jest.resetModules()
      })

      afterEach(() => {
        Object.defineProperty(process, 'platform', { value: platform })
      })

      it('throws error if failed to launch', async () => {
        jest
          .spyOn(puppeteer, 'launch')
          .mockRejectedValue(new Error('Failed to launch'))

        await expect(
          new ChromeBrowser({ path: '/path/to/chrome' }).launch()
        ).rejects.toThrow('Failed to launch')
      })

      it('throws user-friendly error if failed to launch the snap browser by AppArmor confinement', async () => {
        jest
          .spyOn(puppeteer, 'launch')
          .mockRejectedValue(new Error('need to run as root or suid'))

        Object.defineProperty(process, 'platform', { value: 'linux' })

        await expect(
          new ChromeBrowser({ path: '/snap/bin/chrome' }).launch()
        ).rejects.toMatchInlineSnapshot(
          `[CLIError: Marp CLI has detected trying to spawn Chromium browser installed by snap, from the confined environment like another snap app. At least either of Chrome/Chromium or the shell environment must be non snap app.]`
        )
      })
    })

    describe('Data directory', () => {
      it('makes uniq data directory', async () => {
        const mockedMkdir = jest.mocked(fs.promises.mkdir)
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()

        expect(mockedMkdir).toHaveBeenCalledWith(
          expect.stringContaining(path.join(os.tmpdir(), 'marp-cli-')),
          { recursive: true }
        )

        const userDataDir = mockedMkdir.mock.calls[0][0]
        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.arrayContaining([`--user-data-dir=${userDataDir}`]),
          })
        )

        // Check uniqueness
        mockedMkdir.mockClear()
        await new ChromeBrowser({ path: '/path/to/chrome' }).launch()
        expect(userDataDir).not.toEqual(mockedMkdir.mock.calls[0][0])
      })

      it('makes data directory to Windows if trying to spawn Chrome in the host Windows from WSL', async () => {
        jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)
        jest
          .spyOn(wsl, 'getWindowsEnv')
          .mockResolvedValue(String.raw`C:\Users\user\AppData\Local\Temp`)
        jest
          .spyOn(wsl, 'translateWindowsPathToWSL')
          .mockImplementation(async (path) =>
            path
              .replace(/\\/g, '/')
              .replace(
                /^([a-z]):\//i,
                (_, drive) => `/mnt/${drive.toLowerCase()}/`
              )
          )

        await new ChromeBrowser({
          path: '/mnt/c/Program Files/Google/Chrome/chrome.exe',
        }).launch()

        expect(fs.promises.mkdir).toHaveBeenCalledWith(
          expect.stringContaining(
            '/mnt/c/Users/user/AppData/Local/Temp/marp-cli-'
          ),
          { recursive: true }
        )

        expect(puppeteer.launch).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.arrayContaining([
              expect.stringContaining(
                // Chrome is a Windows application, so the path should be Windows style
                String.raw`--user-data-dir=C:\Users\user\AppData\Local\Temp\marp-cli-`
              ),
            ]),
          })
        )
      })
    })
  })
})

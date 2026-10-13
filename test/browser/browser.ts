import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as puppeteer from 'puppeteer-core'
import {
  Browser,
  browserDataDirParent,
  cleanUpUnusedDataDirs,
} from '../../src/browser/browser'
import { FirefoxBrowser } from '../../src/browser/browsers/firefox'
import * as wsl from '../../src/utils/wsl'

jest.mock('puppeteer-core')

afterEach(() => {
  jest.resetAllMocks()
  jest.restoreAllMocks()
})

describe('Browser class', () => {
  describe('#launch', () => {
    const mockedBrowser = { once: jest.fn() }

    beforeEach(() => {
      jest.spyOn(puppeteer as any, 'launch').mockResolvedValue(mockedBrowser)
    })

    it('calls #launch in puppeteer-core with caching', async () => {
      const browser = new FirefoxBrowser({ path: '/path/to/firefox' })

      expect(await browser.launch()).toBe(mockedBrowser)
      expect(await browser.launch()).toBe(mockedBrowser)
      expect(puppeteer.launch).toHaveBeenCalledTimes(1)
    })
  })

  describe('[Symbol.asyncDisposable()]', () => {
    it('calls #close when disposed', async () => {
      const closeSpy = jest.spyOn(Browser.prototype, 'close')
      {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        await using _browser = new FirefoxBrowser({ path: '/path/to/firefox' })
      }
      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe('#browserInWSLHost', () => {
    it('always returns false if the current environment is not WSL', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)

      expect(
        await new FirefoxBrowser({
          path: '/mnt/c/Program Files/Firefox/firefox.exe',
        }).browserInWSLHost()
      ).toBe(false)
    })

    it('returns true if the current environment is WSL and the browser path is located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      expect(
        await new FirefoxBrowser({
          path: '/mnt/c/Program Files/Firefox/firefox.exe',
        }).browserInWSLHost()
      ).toBe(true)
    })

    it('returns false if the current environment is WSL and the browser path is not located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      expect(
        await new FirefoxBrowser({
          path: '/usr/bin/firefox',
        }).browserInWSLHost()
      ).toBe(false)
    })

    it('returns true if the current environment is WSL, the browser path is located in the guest OS, but the spawned browser has located in the host OS', async () => {
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(1)

      const browser = new FirefoxBrowser({
        path: '/usr/bin/firefox-host', // Assuming this is an alias to /mnt/c/Program Files/Firefox/firefox.exe
      })

      const browserMock = {
        once: jest.fn(),
        process: jest.fn(() => ({
          spawnfile: '/mnt/c/Program Files/Firefox/firefox.exe',
        })),
      }

      jest
        .spyOn(browser as any, 'launchPuppeteer')
        .mockResolvedValue(browserMock)

      // If not yet the browser is spawned, it is still false
      expect(await browser.browserInWSLHost()).toBe(false)

      // After the browser is spawned, it should be true
      expect(await browser.launch()).toBe(browserMock)
      expect(await browser.browserInWSLHost()).toBe(true)

      // If close the browser, it should be false again
      await browser.close()
      expect(await browser.browserInWSLHost()).toBe(false)
    })
  })

  describe('Data directory cleanup', () => {
    let tmp: string

    beforeEach(async () => {
      tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'marp-cli-test-'))
      jest.spyOn(os, 'tmpdir').mockReturnValue(tmp)
      jest.spyOn(wsl, 'isWSL').mockResolvedValue(0)
    })

    afterEach(async () => {
      await fs.promises.rm(tmp, { recursive: true, force: true })
    })

    it('removes profiles without the lock file, and keeps locked ones', async () => {
      const parent = path.join(tmp, browserDataDirParent)

      for (const name of ['unused', 'locked', 'current'])
        await fs.promises.mkdir(path.join(parent, name), { recursive: true })

      await fs.promises.writeFile(
        path.join(parent, 'locked.lock'),
        String(process.pid)
      )
      await cleanUpUnusedDataDirs(parent, 'current')

      expect(fs.existsSync(path.join(parent, 'unused'))).toBe(false)
      expect(fs.existsSync(path.join(parent, 'locked'))).toBe(true)
      expect(fs.existsSync(path.join(parent, 'current'))).toBe(true)
    })

    it('removes profiles whose lock file was left by a process no longer alive', async () => {
      const parent = path.join(tmp, browserDataDirParent)
      const finished = spawnSync(process.execPath, ['-e', ''])

      await fs.promises.mkdir(path.join(parent, 'stale'), { recursive: true })
      await fs.promises.writeFile(
        path.join(parent, 'stale.lock'),
        String(finished.pid)
      )
      await fs.promises.mkdir(path.join(parent, 'alive'), { recursive: true })
      await fs.promises.writeFile(
        path.join(parent, 'alive.lock'),
        String(process.pid)
      )

      await cleanUpUnusedDataDirs(parent, 'current')

      expect(fs.existsSync(path.join(parent, 'stale'))).toBe(false)
      expect(fs.existsSync(path.join(parent, 'stale.lock'))).toBe(false)
      expect(fs.existsSync(path.join(parent, 'alive'))).toBe(true)
      expect(fs.existsSync(path.join(parent, 'alive.lock'))).toBe(true)
    })

    it('removes stale lock files without the profile, and keeps alive ones', async () => {
      const parent = path.join(tmp, browserDataDirParent)
      const finished = spawnSync(process.execPath, ['-e', ''])

      await fs.promises.mkdir(parent, { recursive: true })
      await fs.promises.writeFile(
        path.join(parent, 'orphan.lock'),
        String(finished.pid)
      )
      await fs.promises.writeFile(
        path.join(parent, 'creating.lock'),
        String(process.pid)
      )

      await cleanUpUnusedDataDirs(parent, 'current')

      expect(fs.existsSync(path.join(parent, 'orphan.lock'))).toBe(false)
      expect(fs.existsSync(path.join(parent, 'creating.lock'))).toBe(true)
    })

    it('creates the profile with the lock file under the shared parent directory', async () => {
      jest
        .spyOn(puppeteer as any, 'launch')
        .mockResolvedValue({ once: jest.fn() })

      const parent = path.join(tmp, browserDataDirParent)
      await fs.promises.mkdir(path.join(parent, 'left-by-finished-process'), {
        recursive: true,
      })

      const browser = new FirefoxBrowser({ path: '/path/to/firefox' })
      const dir: string = await (browser as any).puppeteerDataDir()

      expect(path.dirname(dir)).toBe(parent)
      expect(fs.existsSync(dir)).toBe(true)
      expect(fs.readFileSync(`${dir}.lock`, 'utf8')).toBe(String(process.pid))

      // The cleanup runs in background
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(fs.existsSync(path.join(parent, 'left-by-finished-process'))).toBe(
        false
      )
    })
  })
})

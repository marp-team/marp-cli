import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { nanoid } from 'nanoid'
import { launch } from 'puppeteer-core'
import type {
  Browser as PuppeteerBrowser,
  PuppeteerLaunchOptions,
} from 'puppeteer-core'
import { CLIErrorCode, error, isError } from '../../error'
import { isInsideContainer } from '../../utils/container'
import { debugBrowser } from '../../utils/debug'
import {
  isWSL,
  resolveWindowsEnv,
  resolveWSLPathToGuestSync,
} from '../../utils/wsl'
import { Browser } from '../browser'
import type { BrowserKind, BrowserProtocol, BrowserOptions } from '../browser'
import { isSnapBrowser } from '../finders/utils'

let wslTmp: string | undefined

export class ChromeBrowser extends Browser {
  static readonly kind: BrowserKind = 'chrome'
  static readonly protocol: BrowserProtocol = 'webDriverBiDi'

  private _puppeteerDataDir?: string

  #dataDirName: string

  constructor(opts: BrowserOptions) {
    super(opts)

    this.#dataDirName = `marp-cli-${nanoid(10)}`
  }

  protected async launchPuppeteer(
    opts: Omit<PuppeteerLaunchOptions, 'userDataDir'> // userDataDir cannot overload in current implementation
  ): Promise<PuppeteerBrowser> {
    const ignoreDefaultArgsSet = new Set(
      typeof opts.ignoreDefaultArgs === 'object' ? opts.ignoreDefaultArgs : []
    )

    // Escape hatch for force-extensions policy for Chrome enterprise
    // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-windows
    // https://github.com/marp-team/marp-cli/issues/231
    if (process.env.CHROME_ENABLE_EXTENSIONS) {
      ignoreDefaultArgsSet.add('--disable-extensions')
    }

    const baseOpts = this.generateLaunchOptions({
      headless: this.puppeteerHeadless(),
      pipe: await this.puppeteerPipe(),
      // userDataDir: await this.puppeteerDataDir(), // userDataDir will set in args option due to wrong path normalization in WSL
      ...opts,
      userDataDir: undefined,
      args: await this.puppeteerArgs(opts.args ?? []),
      ignoreDefaultArgs: opts.ignoreDefaultArgs === true || [
        ...ignoreDefaultArgsSet,
      ],
    })

    const tryLaunch = async (
      extraOpts: PuppeteerLaunchOptions = {}
    ): Promise<PuppeteerBrowser> => {
      const finalizedOpts = { ...baseOpts, ...extraOpts }

      try {
        return await launch(finalizedOpts)
      } catch (e: unknown) {
        if (isError(e)) {
          // Retry to launch with WebSocket connection if failed to connect to Chrome with pipe
          // https://github.com/puppeteer/puppeteer/issues/6258
          if (finalizedOpts.pipe) {
            return await tryLaunch({ ...extraOpts, pipe: false })
          }

          // User-friendly warning when tried to spawn the snap browser within the snapd container
          if (
            /need to run as root or suid/im.test(e.message) &&
            (await isSnapBrowser(this.path))
          ) {
            error(
              'Marp CLI has detected trying to spawn Chromium browser installed by snap, from the confined environment like another snap app. At least either of Chrome/Chromium or the shell environment must be non snap app.',
              CLIErrorCode.CANNOT_SPAWN_SNAP_CHROMIUM
            )
          }
        }
        throw e
      }
    }

    return await tryLaunch()
  }

  private async puppeteerArgs(extraArgs: string[] = []) {
    const args = new Set([
      `--user-data-dir=${await this.puppeteerDataDir()}`,
      '--test-type',
      ...extraArgs,
    ])

    if (!(await this.puppeteerArgsEnableSandbox())) args.add('--no-sandbox')

    return [...args]
  }

  private async puppeteerArgsEnableSandbox() {
    if (process.env.CHROME_NO_SANDBOX) return false
    if (isInsideContainer()) return false
    if (await isWSL()) return false

    return true
  }

  private async puppeteerPipe() {
    if (await isWSL()) return false
    if (await isSnapBrowser(this.path)) return false

    return true
  }

  private puppeteerHeadless() {
    const modeEnv = process.env.PUPPETEER_HEADLESS_MODE?.toLowerCase() ?? ''
    return ['old', 'legacy', 'shell'].includes(modeEnv) ? 'shell' : true
  }

  private async puppeteerDataDir() {
    if (this._puppeteerDataDir === undefined) {
      let requiredResolveWSLPath = false

      this._puppeteerDataDir = await (async () => {
        // In WSL environment, Marp CLI may use Chrome on Windows. If Chrome has
        // located in host OS (Windows), we have to specify Windows path.
        if (await this.browserInWSLHost()) {
          if (wslTmp === undefined) wslTmp = await resolveWindowsEnv('TMP')
          if (wslTmp !== undefined) {
            requiredResolveWSLPath = true
            return path.win32.resolve(wslTmp, this.#dataDirName)
          }
        }
        return path.resolve(os.tmpdir(), this.#dataDirName)
      })()

      debugBrowser(`Chrome data directory: %s`, this._puppeteerDataDir)

      // Ensure the data directory is created
      const mkdirPath = requiredResolveWSLPath
        ? resolveWSLPathToGuestSync(this._puppeteerDataDir)
        : this._puppeteerDataDir

      await fs.promises.mkdir(mkdirPath, { recursive: true })
      debugBrowser(`Created data directory: %s`, mkdirPath)
    }
    return this._puppeteerDataDir
  }
}

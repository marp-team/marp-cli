import { launch } from 'puppeteer-core'
import type {
  Browser as PuppeteerBrowser,
  PuppeteerLaunchOptions,
} from 'puppeteer-core'
import { CLIErrorCode, error, isError } from '../../error'
import { isInsideContainer } from '../../utils/container'
import { isWSL } from '../../utils/wsl'
import { Browser } from '../browser'
import type { BrowserKind, BrowserProtocol } from '../browser'
import { isSnapBrowser } from '../finders/utils'

export class ChromeBrowser extends Browser {
  static readonly kind: BrowserKind = 'chrome'
  static readonly protocol: BrowserProtocol = 'webDriverBiDi'

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

    const baseOpts = await this.generateLaunchOptions({
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
      '--disable-component-update', // https://github.com/puppeteer/puppeteer/pull/13201
      '--test-type',
      ...extraArgs,
    ])

    if (!(await this.puppeteerArgsEnableSandbox())) args.add('--no-sandbox')
    if (!this.puppeteerArgsEnableGPU()) args.add('--disable-gpu')

    return [...args]
  }

  private async puppeteerArgsEnableSandbox() {
    if (process.env.CHROME_NO_SANDBOX) return false
    if (process.getuid?.() === 0) return false // Running as root without --no-sandbox is not supported.
    if (isInsideContainer()) return false
    if (await isWSL()) return false

    return true
  }

  private puppeteerArgsEnableGPU() {
    if (process.env.CHROME_DISABLE_GPU) return false

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
}

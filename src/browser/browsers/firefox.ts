import { launch } from 'puppeteer-core'
import type {
  Browser as PuppeteerBrowser,
  PuppeteerLaunchOptions,
} from 'puppeteer-core'
import { Browser } from '../browser'
import type { BrowserKind, BrowserProtocol } from '../browser'

export class FirefoxBrowser extends Browser {
  static readonly kind: BrowserKind = 'firefox'
  static readonly protocol: BrowserProtocol = 'webDriverBiDi'

  protected async launchPuppeteer(
    opts: PuppeteerLaunchOptions
  ): Promise<PuppeteerBrowser> {
    return await launch(
      await this.generateLaunchOptions({
        ...opts,

        // NOTE: Currently Windows path is incompatible with Puppeteer's preparing
        // FIXME: CircleCI does not work custom user data directory
        userDataDir:
          !!process.env.CIRCLECI || (await this.browserInWSLHost())
            ? undefined
            : await this.puppeteerDataDir(),
      })
    )
  }
}

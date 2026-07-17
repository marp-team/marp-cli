import { launch } from 'puppeteer-core'
import type { Browser as PuppeteerBrowser, LaunchOptions } from 'puppeteer-core'
import { Browser } from '../browser'
import type { BrowserKind, BrowserProtocol } from '../browser'

export class FirefoxBrowser extends Browser {
  static readonly kind: BrowserKind = 'firefox'
  static readonly protocol: BrowserProtocol = 'webDriverBiDi'

  protected async launchPuppeteer(
    opts: LaunchOptions
  ): Promise<PuppeteerBrowser> {
    return await launch(
      await this.generateLaunchOptions({
        ...opts,

        extraPrefsFirefox: {
          // https://github.com/marp-team/marp-core/pull/424#discussion_r3605672166
          'svg.context-properties.content.enabled': true,
          ...opts.extraPrefsFirefox,
        },

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

import type { PuppeteerLaunchOptions } from 'puppeteer-core'
import macDockIcon from '../../assets/mac-dock-icon.png'
import { BrowserProtocol } from '../browser'
import { ChromeBrowser } from './chrome'

export class ChromeCdpBrowser extends ChromeBrowser {
  static readonly protocol: BrowserProtocol = 'cdp'

  protected async launchPuppeteer(opts: PuppeteerLaunchOptions) {
    const puppeteer = await super.launchPuppeteer(opts)

    // macOS specific: Set Marp icon asynchrnously
    if (process.platform === 'darwin') {
      puppeteer
        .target()
        .createCDPSession()
        .then((session) => {
          session
            .send('Browser.setDockTile', { image: macDockIcon.slice(22) })
            .catch(() => void 0)
        })
    }

    return puppeteer
  }
}

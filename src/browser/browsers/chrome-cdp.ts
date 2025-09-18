import type { LaunchOptions } from 'puppeteer-core'
import macDockIcon from '../../assets/mac-dock-icon.png'
import macDockLiquidIcon from '../../assets/mac-dock-liquid-icon.png'
import { shouldUseLiquidGlass } from '../../utils/mac'
import { BrowserProtocol } from '../browser'
import { ChromeBrowser } from './chrome'

export class ChromeCdpBrowser extends ChromeBrowser {
  static readonly protocol: BrowserProtocol = 'cdp'

  protected async launchPuppeteer(opts: LaunchOptions) {
    const puppeteer = await super.launchPuppeteer(opts)

    // macOS specific: Set Marp icon asynchronously
    if (process.platform === 'darwin') {
      puppeteer
        .target()
        .createCDPSession()
        .then((session) => {
          session
            .send('Browser.setDockTile', {
              image: (shouldUseLiquidGlass()
                ? macDockLiquidIcon
                : macDockIcon
              ).slice(22),
            })
            .catch(() => void 0)
        })
    }

    return puppeteer
  }
}

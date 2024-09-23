import type {
  Browser,
  BrowserKind,
  BrowserProtocol,
  BrowserPurpose,
} from './browser'

export interface BrowserManagerQuery {
  browser?: Browser
  kind?: BrowserKind
  protocol?: BrowserProtocol
  purpose?: BrowserPurpose
}

export class BrowserManager {
  private browsers = new Set<Browser>()

  register(browser: Browser): void {
    this.browsers.add(browser)
  }

  findBy(query: BrowserManagerQuery): Browser | undefined {
    for (const browser of this.browsers) {
      if (query.browser && browser !== query.browser) continue
      if (query.kind && browser.kind !== query.kind) continue
      if (query.protocol && browser.protocol !== query.protocol) continue
      if (query.purpose && browser.purpose !== query.purpose) continue

      return browser
    }
  }
}

export const browserManager = new BrowserManager()
export default browserManager

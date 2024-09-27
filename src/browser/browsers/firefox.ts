import { Browser } from '../browser'
import type { BrowserKind, BrowserProtocol } from '../browser'

export class FirefoxBrowser extends Browser {
  static readonly kind: BrowserKind = 'firefox'
  static readonly protocol: BrowserProtocol = 'webDriverBiDi'
}

import { Browser } from '../browser'

export class FirefoxBrowser extends Browser {
  static readonly kind = 'firefox' as const
  static readonly protocol = 'webdriver-bidi' as const
}

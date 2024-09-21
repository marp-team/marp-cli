import { Browser } from '../browser'

export class FirefoxBrowser extends Browser {
  kind = 'firefox' as const
  protocol = 'webdriver-bidi' as const
}

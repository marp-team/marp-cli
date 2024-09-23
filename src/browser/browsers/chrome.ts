import { Browser } from '../browser'

export class ChromeBrowser extends Browser {
  static readonly kind = 'chrome' as const
  static readonly protocol = 'webdriver-bidi' as const
}

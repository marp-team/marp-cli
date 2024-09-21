import { Browser } from '../browser'

export class ChromeBrowser extends Browser {
  kind = 'chrome' as const
  protocol = 'webdriver-bidi' as const
}

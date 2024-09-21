import { Browser } from '../browser'

export class ChromeCdpBrowser extends Browser {
  kind = 'chrome' as const
  protocol = 'cdp' as const
}

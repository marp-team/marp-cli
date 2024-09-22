import { Browser } from '../browser'

export class ChromeCdpBrowser extends Browser {
  static readonly kind = 'chrome' as const
  static readonly protocol = 'cdp' as const
}

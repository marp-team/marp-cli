export type BrowserKind = 'chrome' | 'firefox'
export type BrowserProtocol = 'webdriver-bidi' | 'cdp'
export type BrowserPurpose = 'convert' | 'preview'

export interface BrowserOptions {
  purpose: BrowserPurpose
}

export abstract class Browser {
  static readonly kind: BrowserKind
  static readonly protocol: BrowserProtocol

  // ---

  purpose: BrowserPurpose

  constructor(opts: BrowserOptions) {
    this.purpose = opts.purpose
  }

  get kind() {
    return (this.constructor as typeof Browser).kind
  }

  get protocol() {
    return (this.constructor as typeof Browser).protocol
  }
}

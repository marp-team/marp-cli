export type BrowserKind = 'chrome' | 'firefox'
export type BrowserProtocol = 'webdriver-bidi' | 'cdp'
export type BrowserPurpose = 'convert' | 'preview'

export interface BrowserOptions {
  purpose: BrowserPurpose
}

export abstract class Browser {
  abstract kind: BrowserKind
  abstract protocol: BrowserProtocol
  purpose: BrowserPurpose

  constructor(opts: BrowserOptions) {
    this.purpose = opts.purpose
  }
}

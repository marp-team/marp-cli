import { error } from '../error'
import { debugBrowser } from '../utils/debug'
import { createMemoizedPromiseContext } from '../utils/memoized-promise'
import type { Browser, BrowserProtocol } from './browser'
import { ChromeCdpBrowser } from './browsers/chrome-cdp'
import { defaultFinders, findBrowser } from './finder'
import type { BrowserFinderResult, FinderName } from './finder'

export interface BrowserManagerConfig {
  /** Browser finders */
  finders?: FinderName | FinderName[]

  /** Preferred path */
  path?: string

  /** Preferred protocol */
  protocol?: BrowserProtocol

  /** Timeout for browser operations */
  timeout?: number
}

export class BrowserManager implements AsyncDisposable {
  // Finder
  private _finders: readonly FinderName[] = defaultFinders
  private _finderPreferredPath?: string
  private _finderResult = createMemoizedPromiseContext<BrowserFinderResult>()

  // Browser
  private _conversionBrowser = createMemoizedPromiseContext<Browser>()
  private _preferredProtocol: BrowserProtocol = 'webDriverBiDi'
  private _previewBrowser = createMemoizedPromiseContext<ChromeCdpBrowser>()
  private _timeout?: number

  constructor(config: BrowserManagerConfig = {}) {
    this.configure(config)
  }

  get timeout() {
    return this._timeout
  }

  configure(config: BrowserManagerConfig) {
    if (config.finders) {
      this._finders = ([] as FinderName[]).concat(config.finders)
      this._finderResult.value = undefined // Reset finder result cache
    }
    if (config.path !== undefined) {
      this._finderPreferredPath = config.path
      this._finderResult.value = undefined // Reset finder result cache
    }
    if (config.protocol) {
      if (this._conversionBrowser)
        debugBrowser(
          'WARNING: Changing protocol after created browser for conversion is not supported'
        )

      this._preferredProtocol = config.protocol
    }
    if (config.timeout !== undefined) this._timeout = config.timeout

    debugBrowser('Browser manager configured: %o', config)
  }

  async findBrowser() {
    return this._finderResult.init(() =>
      findBrowser(this._finders, { preferredPath: this._finderPreferredPath })
    )
  }

  // Browser for converter
  async browserForConversion(): Promise<Browser> {
    return this._conversionBrowser.init(async () => {
      const { acceptedBrowsers, path } = await this.findBrowser()

      const browser =
        acceptedBrowsers.find(
          ({ protocol }) => protocol === this._preferredProtocol
        ) ||
        (() => {
          if (acceptedBrowsers.length > 0) {
            debugBrowser(
              'The available browsers do not support the preferred protocol "%s". Using the first available browser.',
              this._preferredProtocol
            )
          }
          return acceptedBrowsers[0]
        })()

      if (!browser) error('No browser found for conversion')
      debugBrowser('Use browser class for conversion: %o', browser)

      // @ts-expect-error ts2511: TS cannot create an instance of an abstract class
      return new browser({ path, timeout: this.timeout })
    })
  }

  // Browser for preview window
  async browserForPreview(): Promise<ChromeCdpBrowser> {
    return this._previewBrowser.init(async () => {
      const { acceptedBrowsers, path } = await this.findBrowser()

      if (!acceptedBrowsers.some((browser) => browser === ChromeCdpBrowser)) {
        error('No browser found for preview')
      }
      debugBrowser('Use browser class for preview: %o', ChromeCdpBrowser)

      return new ChromeCdpBrowser({ path, timeout: this.timeout })
    })
  }

  async dispose() {
    await Promise.all([
      (async () => {
        await (await this._conversionBrowser.value)?.close()
        this._conversionBrowser.value = undefined
      })(),
      (async () => {
        await (await this._previewBrowser.value)?.close()
        this._previewBrowser.value = undefined
      })(),
    ])
  }

  async [Symbol.asyncDispose]() {
    await this.dispose()
  }
}

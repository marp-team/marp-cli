import { EventEmitter } from 'node:events'
import { launch } from 'puppeteer-core'
import type {
  Browser as PuppeteerBrowser,
  ProtocolType,
  PuppeteerLaunchOptions,
  Page,
} from 'puppeteer-core'
import type TypedEventEmitter from 'typed-emitter'
import { isWSL } from '../utils/wsl'

export type BrowserKind = 'chrome' | 'firefox'
export type BrowserProtocol = ProtocolType

export interface BrowserOptions {
  path: string
  timeout?: number
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- TypedEventEmitter is only compatible with type
type BrowserEvents = {
  close: (browser: PuppeteerBrowser) => void
  disconnect: (browser: PuppeteerBrowser) => void
  launch: (browser: PuppeteerBrowser) => void
}

const wslHostMatcher = /^\/mnt\/[a-z]\//

export abstract class Browser
  extends (EventEmitter as new () => TypedEventEmitter<BrowserEvents>)
  implements AsyncDisposable
{
  static readonly kind: BrowserKind
  static readonly protocol: BrowserProtocol

  path: string
  protocolTimeout: number
  puppeteer: PuppeteerBrowser | undefined
  timeout: number

  constructor(opts: BrowserOptions) {
    super()

    this.path = opts.path
    this.timeout = opts.timeout ?? 30000
    this.protocolTimeout =
      this.timeout === 0 ? 0 : Math.max(180_000, this.timeout)
  }

  get kind() {
    return (this.constructor as typeof Browser).kind
  }

  get protocol() {
    return (this.constructor as typeof Browser).protocol
  }

  async launch(opts: PuppeteerLaunchOptions = {}): Promise<PuppeteerBrowser> {
    if (!this.puppeteer) {
      const puppeteer = await this.launchPuppeteer(opts)

      puppeteer.once('disconnected', () => {
        this.emit('disconnect', puppeteer)
        this.puppeteer = undefined
      })

      this.puppeteer = puppeteer
      this.emit('launch', puppeteer)

      return puppeteer
    }
    return this.puppeteer
  }

  async withPage<T>(fn: (page: Page) => T) {
    const puppeteer = await this.launch()
    const page = await puppeteer.newPage()

    page.setDefaultTimeout(this.timeout)
    page.setDefaultNavigationTimeout(this.timeout)

    try {
      return await fn(page)
    } finally {
      await page.close()
    }
  }

  async close() {
    if (this.puppeteer) {
      const { puppeteer } = this

      if (puppeteer.connected) {
        await puppeteer.close()
        this.emit('close', puppeteer)
      }

      this.puppeteer = undefined
    }
  }

  async [Symbol.asyncDispose]() {
    await this.close()
  }

  async browserInWSLHost(): Promise<boolean> {
    return (
      !!(await isWSL()) &&
      wslHostMatcher.test(this.puppeteer?.process()?.spawnfile ?? this.path)
    )
  }

  /** @internal Overload in subclass to customize launch behavior */
  protected async launchPuppeteer(
    opts: PuppeteerLaunchOptions
  ): Promise<PuppeteerBrowser> {
    return await launch(this.generateLaunchOptions(opts))
  }

  /** @internal */
  protected generateLaunchOptions(
    mergeOptions: PuppeteerLaunchOptions = {}
  ): PuppeteerLaunchOptions {
    return {
      browser: this.kind,
      executablePath: this.path,
      headless: true,
      protocol: this.protocol,
      protocolTimeout: this.protocolTimeout,
      timeout: this.timeout,
      ...mergeOptions,
    }
  }
}

import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { nanoid } from 'nanoid'
import type {
  Browser as PuppeteerBrowser,
  ProtocolType,
  PuppeteerLaunchOptions,
  Page,
} from 'puppeteer-core'
import type TypedEventEmitter from 'typed-emitter'
import { debugBrowser } from '../utils/debug'
import { getWindowsEnv, isWSL, translateWindowsPathToWSL } from '../utils/wsl'

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

let wslTmp: string | undefined

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
  #dataDirName: string

  private _puppeteerDataDir?: string

  constructor(opts: BrowserOptions) {
    super()

    this.#dataDirName = `marp-cli-${nanoid(10)}`
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

        debugBrowser('Browser disconnected (Cleaned up puppeteer instance)')
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

  /** @internal Overload launch behavior in subclass */
  protected abstract launchPuppeteer(
    opts: PuppeteerLaunchOptions
  ): Promise<PuppeteerBrowser>

  /** @internal */
  protected async generateLaunchOptions(
    mergeOptions: PuppeteerLaunchOptions = {}
  ): Promise<PuppeteerLaunchOptions> {
    const opts = {
      browser: this.kind,
      executablePath: this.path,
      headless: true,
      protocol: this.protocol,
      protocolTimeout: this.protocolTimeout,
      timeout: this.timeout,
      ...mergeOptions,
    }

    // Don't pass Linux environment variables to Windows process
    if (await this.browserInWSLHost()) opts.env = {}

    return opts
  }

  /** @internal */
  protected async puppeteerDataDir() {
    if (this._puppeteerDataDir === undefined) {
      let needToTranslateWindowsPathToWSL = false

      this._puppeteerDataDir = await (async () => {
        // In WSL environment, Marp CLI may use Chrome on Windows. If Chrome has
        // located in host OS (Windows), we have to specify Windows path.
        if (await this.browserInWSLHost()) {
          if (wslTmp === undefined) wslTmp = await getWindowsEnv('TMP')
          if (wslTmp !== undefined) {
            needToTranslateWindowsPathToWSL = true
            return path.win32.resolve(wslTmp, this.#dataDirName)
          }
        }
        return path.resolve(os.tmpdir(), this.#dataDirName)
      })()

      debugBrowser(`Chrome data directory: %s`, this._puppeteerDataDir)

      // Ensure the data directory is created
      const mkdirPath = needToTranslateWindowsPathToWSL
        ? await translateWindowsPathToWSL(this._puppeteerDataDir)
        : this._puppeteerDataDir

      await fs.promises.mkdir(mkdirPath, { recursive: true })
      debugBrowser(`Created data directory: %s`, mkdirPath)
    }
    return this._puppeteerDataDir
  }
}

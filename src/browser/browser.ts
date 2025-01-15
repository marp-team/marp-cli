import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isPromise } from 'node:util/types'
import { nanoid } from 'nanoid'
import type {
  Browser as PuppeteerBrowser,
  ProtocolType,
  LaunchOptions,
  Page,
} from 'puppeteer-core'
import type TypedEventEmitter from 'typed-emitter'
import { debugBrowser } from '../utils/debug'
import { createMemoizedPromiseContext } from '../utils/memoized-promise'
import {
  getWindowsEnv,
  isWSL,
  translateWSLPathToWindows,
  translateWindowsPathToWSL,
} from '../utils/wsl'

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
  timeout: number
  #dataDirName: string

  private _puppeteerDataDir = createMemoizedPromiseContext<string>()
  private _puppeteer = createMemoizedPromiseContext<PuppeteerBrowser>()

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

  async launch(opts: LaunchOptions = {}) {
    return this._puppeteer.init(async () => {
      debugBrowser('Launching browser via Puppeteer...')

      const puppeteer = await this.launchPuppeteer(opts)

      puppeteer.once('disconnected', () => {
        this.emit('disconnect', puppeteer)
        this._puppeteer.value = undefined

        debugBrowser('Browser disconnected (Cleaned up puppeteer instance)')
      })

      this.emit('launch', puppeteer)

      return puppeteer
    })
  }

  async withPage<T>(fn: (page: Page) => T) {
    const debugPageId = nanoid(8)
    const puppeteer = await this.launch()
    const page = await puppeteer.newPage()

    debugBrowser('Created a new page [%s]', debugPageId)

    page.setDefaultTimeout(this.timeout)
    page.setDefaultNavigationTimeout(this.timeout)

    try {
      return await fn(page)
    } finally {
      await page.close()
      debugBrowser('Page closed [%s]', debugPageId)
    }
  }

  async close() {
    const pptr = await this._puppeteer.value

    if (pptr) {
      if (pptr.connected) {
        await pptr.close()
        this.emit('close', pptr)
      }

      this._puppeteer.value = undefined
    }
  }

  async [Symbol.asyncDispose]() {
    await this.close()
  }

  async browserInWSLHost(): Promise<boolean> {
    return (
      !!(await isWSL()) &&
      wslHostMatcher.test(
        // This function may be called while launching Puppeteer. If the browser
        // value awaited, Marp CLI will bring deadlock. So we should check the
        // value is already resolved (non-Promise truthy value) or not (Promise
        // or undefined).
        (this._puppeteer.value && !isPromise(this._puppeteer.value)
          ? this._puppeteer.value.process()?.spawnfile
          : null) ?? this.path
      )
    )
  }

  async resolveToFileURI(filePath: string) {
    return (await this.browserInWSLHost())
      ? `file:${await translateWSLPathToWindows(filePath, true)}`
      : `file://${filePath}`
  }

  /** @internal Overload launch behavior in subclass */
  protected abstract launchPuppeteer(
    opts: LaunchOptions
  ): Promise<PuppeteerBrowser>

  /** @internal */
  protected async generateLaunchOptions(
    mergeOptions: LaunchOptions = {}
  ): Promise<LaunchOptions> {
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
    return this._puppeteerDataDir.init(async () => {
      let needToTranslateWindowsPathToWSL = false

      const dir = await (async () => {
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

      // Ensure the data directory is created
      const mkdirPath = needToTranslateWindowsPathToWSL
        ? await translateWindowsPathToWSL(dir)
        : dir

      await fs.promises.mkdir(mkdirPath, { recursive: true })
      debugBrowser(`Created data directory: %s`, mkdirPath)

      return dir
    })
  }
}

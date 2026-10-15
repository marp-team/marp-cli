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

/**
 * Browser profiles are placed under this sub-directory of the temporary
 * directory. Each profile `foo` has a mutex file `foo.lock` while the browser
 * using it is open. Profiles without a mutex were left by closed browsers or
 * finished processes, and the next browser run removes them in background.
 * (https://github.com/marp-team/marp-cli/issues/678)
 */
export const browserDataDirParent = 'marp-cli-browser'

interface DataDirLock {
  pid: number
  platform: NodeJS.Platform
}

const lockDataDir = async (dir: string) => {
  const lockFile = `${dir}.lock`
  const lock: DataDirLock = { pid: process.pid, platform: process.platform }

  // Create the mutex before the profile, so that a cleanup in other processes
  // never removes the profile before locking.
  await fs.promises.mkdir(path.dirname(dir), { recursive: true })

  const handle = await fs.promises.open(lockFile, 'wx')
  try {
    await handle.writeFile(JSON.stringify(lock))
  } finally {
    await handle.close()
  }

  return lockFile
}

/**
 * A mutex is stale if the process that created it is no longer alive. It
 * happens when the process was killed without running "exit" handlers.
 *
 * A mutex created on another platform (e.g. Windows and WSL share the
 * temporary directory) is always kept, because PIDs belong to a different
 * environment and we cannot determine whether the process is still running.
 */
const isStaleLock = async (lockFile: string) => {
  try {
    const lock: Partial<DataDirLock> = JSON.parse(
      await fs.promises.readFile(lockFile, 'utf8')
    )

    if (lock.platform !== process.platform) return false
    if (!Number.isInteger(lock.pid) || (lock.pid as number) <= 0) return false

    process.kill(lock.pid as number, 0)
    return false
  } catch (e: unknown) {
    // ESRCH: No process with the PID. (EPERM means the process is alive.)
    return (e as NodeJS.ErrnoException)?.code === 'ESRCH'
  }
}

/** @internal */
export const cleanUpUnusedDataDirs = async (parent: string, keep: string) => {
  const entries = await fs.promises.readdir(parent, { withFileTypes: true })
  const names = new Set(entries.map((entry) => entry.name))

  const removeStaleLock = async (lockFile: string) => {
    if (!(await isStaleLock(lockFile))) return false

    try {
      await fs.promises.rm(lockFile, { force: true })
    } catch (e: unknown) {
      debugBrowser('Failed to remove stale lock: %s (%o)', lockFile, e)
    }
    return true
  }

  await Promise.all([
    // Profile directories
    ...entries
      .filter((entry) => entry.isDirectory() && entry.name !== keep)
      .map(async (entry) => {
        const target = path.join(parent, entry.name)

        if (
          names.has(`${entry.name}.lock`) &&
          !(await removeStaleLock(`${target}.lock`))
        )
          return

        try {
          await fs.promises.rm(target, { recursive: true, force: true })
          debugBrowser('Removed unused data directory: %s', target)
        } catch (e: unknown) {
          debugBrowser('Failed to remove data directory: %s (%o)', target, e)
        }
      }),

    // Stale mutex files without profile directory
    ...entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith('.lock') &&
          !names.has(entry.name.slice(0, -'.lock'.length))
      )
      .map((entry) => removeStaleLock(path.join(parent, entry.name))),
  ])
}

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
  #lockFile: string | undefined

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

    // Release the mutex, so that the next browser run can remove the profile.
    // If the process was killed before closing, the mutex becomes stale and is
    // removed by the PID check instead.
    if (this.#lockFile) {
      await fs.promises.rm(this.#lockFile, { force: true })
      this.#lockFile = undefined

      // Relaunching after close must lock the profile again
      this._puppeteerDataDir.value = undefined
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
            return path.win32.resolve(
              wslTmp,
              browserDataDirParent,
              this.#dataDirName
            )
          }
        }
        return path.resolve(
          os.tmpdir(),
          browserDataDirParent,
          this.#dataDirName
        )
      })()

      // Ensure the data directory is created
      const mkdirPath = needToTranslateWindowsPathToWSL
        ? await translateWindowsPathToWSL(dir)
        : dir

      try {
        this.#lockFile = await lockDataDir(mkdirPath)
      } catch (e: unknown) {
        debugBrowser('Failed to lock data directory: %s (%o)', mkdirPath, e)
      }

      await fs.promises.mkdir(mkdirPath, { recursive: true })
      debugBrowser(`Created data directory: %s`, mkdirPath)

      // Remove profiles left by finished processes, without blocking conversion
      cleanUpUnusedDataDirs(
        path.dirname(mkdirPath),
        path.basename(mkdirPath)
      ).catch((e: unknown) => {
        debugBrowser('Failed to clean up unused data directories (%o)', e)
      })

      return dir
    })
  }
}

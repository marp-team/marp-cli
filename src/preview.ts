/* eslint-disable import/export, @typescript-eslint/no-namespace */
import { EventEmitter } from 'events'
import { nanoid } from 'nanoid'
import puppeteer from 'puppeteer-core'
import TypedEmitter from 'typed-emitter'
import macDockIcon from './assets/mac-dock-icon.png'
import { ConvertType, mimeTypes } from './converter'
import { error } from './error'
import { File, FileType } from './file'
import {
  generatePuppeteerDataDirPath,
  generatePuppeteerLaunchArgs,
  launchPuppeteer,
} from './utils/puppeteer'
import { isChromeInWSLHost } from './utils/wsl'

export namespace Preview {
  export type Events = {
    close: (window: any) => void
    exit: () => void
    launch: () => void
    open: (window: any, location: string) => void
    opening: (location: string) => void
  }

  export interface Options {
    height: number
    width: number
  }

  export interface Window extends EventEmitter {
    page: puppeteer.Page
    close: () => Promise<void>
    load: (uri: string) => Promise<void>
  }
}

export class Preview extends (EventEmitter as new () => TypedEmitter<Preview.Events>) {
  readonly options: Preview.Options

  private puppeteerInternal: puppeteer.Browser | undefined

  constructor(opts: Partial<Preview.Options> = {}) {
    super()
    this.options = {
      height: opts.height || 360,
      width: opts.width || 640,
    }
  }

  get puppeteer(): puppeteer.Browser | undefined {
    return this.puppeteerInternal
  }

  async open(location: string) {
    this.emit('opening', location)

    const win = (await this.createWindow()) || (await this.launch())
    win.on('close', () => this.emit('close', win))

    await win.load(location)
    this.emit('open', win, location)

    return win
  }

  async exit() {
    if (this.puppeteer) {
      await this.puppeteer.close()

      this.emit('exit')
      this.puppeteerInternal = undefined
    }
  }

  private createWindowObject(page: puppeteer.Page): Preview.Window {
    const window = new EventEmitter()

    page.on('close', async () => window.emit('close'))

    return Object.assign(window, {
      page,
      close: async () => {
        try {
          return await page.close()
        } catch (e: any) {
          // Ignore raising error if a target page has already close
          /* istanbul ignore next */
          if (!e.message.includes('Target closed.')) throw e
        }
      },
      load: async (uri: string) => {
        await page.goto(uri, { timeout: 0, waitUntil: 'domcontentloaded' })
        await page
          .target()
          .createCDPSession()
          .then((session) => {
            session.send('Page.resetNavigationHistory').catch(() => {
              // No ops
            })
          })
      },
    })
  }

  private async createWindow() {
    try {
      return this.createWindowObject(
        await new Promise<puppeteer.Page>((res, rej) => {
          const pptr = this.puppeteer
          if (!pptr) return rej(false)

          const id = nanoid()
          const idMatcher = (target: puppeteer.Target) => {
            const url = new URL(target.url())

            if (url.searchParams.get('__marp_cli_id') === id) {
              pptr.off('targetcreated', idMatcher)
              ;(async () => res((await target.page())!))() // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
          }

          pptr.on('targetcreated', idMatcher)

          // Open new window with specific identifier
          ;(async () => {
            for (const page of await pptr.pages()) {
              await page.evaluate(
                `window.open('about:blank?__marp_cli_id=${id}', '', 'width=${this.options.width},height=${this.options.height}')`
              )
              break
            }
          })()
        })
      )
    } catch (e: unknown) {
      if (!e) return false
      throw e
    }
  }

  private async launch(): Promise<Preview.Window> {
    const baseArgs = generatePuppeteerLaunchArgs()

    this.puppeteerInternal = await launchPuppeteer({
      ...baseArgs,
      args: [
        ...baseArgs.args,
        `--app=data:text/html,<title>${encodeURIComponent('Marp CLI')}</title>`,
        `--window-size=${this.options.width},${this.options.height}`,
      ],
      defaultViewport: null as any,
      headless: process.env.NODE_ENV === 'test',
      userDataDir: await generatePuppeteerDataDirPath('marp-cli-preview', {
        wslHost: isChromeInWSLHost(baseArgs.executablePath),
      }),
    })

    // Set Marp icon asynchrnously (only for macOS)
    this.puppeteerInternal
      .target()
      .createCDPSession()
      .then((session) => {
        session
          .send('Browser.setDockTile', { image: macDockIcon.slice(22) })
          .catch(() => {
            // No ops
          })
      })

    const handlePageOnClose = async () => {
      const pages = (await this.puppeteer?.pages()) || []
      if (pages.length === 0) await this.exit()
    }

    this.puppeteerInternal.on('targetcreated', (target) => {
      // NOTE: PDF viewer on headfull Chrome may return `null`.
      target.page().then((page) => page?.on('close', handlePageOnClose))
    })

    const [page] = await this.puppeteerInternal.pages()

    let windowObject: Preview.Window | undefined

    /* istanbul ignore next */
    if (process.platform === 'darwin') {
      // An initial app window is not using in macOS for correct handling activation from Dock
      windowObject = (await this.createWindow()) || undefined
      await page.close()
    }

    page.on('close', handlePageOnClose)
    this.emit('launch')

    return windowObject || this.createWindowObject(page)
  }
}

export function fileToURI(file: File, type: ConvertType) {
  if (file.type === FileType.File) {
    // Convert path to file URI
    const uri = file.absolutePath.replace(/\\/g, '/')
    return encodeURI(`file://${uri.startsWith('/') ? '' : '/'}${uri}`)
  }

  if (file.buffer) {
    // Convert to data scheme URI
    return `data:${mimeTypes[type]};base64,${file.buffer.toString('base64')}`
  }

  error('Processing file is not convertible to URI for preview.')
}

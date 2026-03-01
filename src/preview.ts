/* eslint-disable @typescript-eslint/no-namespace */
import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'
import type { Page, Browser, Target } from 'puppeteer-core'
import TypedEmitter from 'typed-emitter'
import { BrowserManager } from './browser/manager'
import { ConvertType, mimeTypes } from './converter'
import { error } from './error'
import { File, FileType } from './file'
import { debugPreview } from './utils/debug'

const emptyPageURI = `data:text/html;base64,PHRpdGxlPk1hcnAgQ0xJPC90aXRsZT4` // <title>Marp CLI</title>

export namespace Preview {
  type PartialByKeys<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> &
    Partial<Pick<T, K>>

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- TypedEmitter requires type definition instead of interface
  export type Events = {
    close: (window: any) => void
    exit: () => void
    launch: () => void
    open: (window: any, location: string) => void
    opening: (location: string) => void
  }

  export interface Options {
    browserManager: BrowserManager
    height: number
    width: number
  }

  export type ConstructorOptions = PartialByKeys<Options, 'height' | 'width'>

  export interface Window extends EventEmitter {
    page: Page
    close: () => Promise<void>
    load: (uri: string) => Promise<void>
  }
}

export class Preview extends (EventEmitter as new () => TypedEmitter<Preview.Events>) {
  readonly options: Preview.Options

  private puppeteerInternal: Browser | undefined

  constructor(opts: Preview.ConstructorOptions) {
    super()

    this.options = {
      browserManager: opts.browserManager,
      height: opts.height || 360,
      width: opts.width || 640,
    }

    debugPreview('Initialized preview instance: %o', this.options)
  }

  get puppeteer(): Browser | undefined {
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
    debugPreview('Requested to exit preview')

    if (this.puppeteer) {
      debugPreview('Closing puppeteer instance for preview...')

      await this.puppeteer.close()

      this.emit('exit')
      this.puppeteerInternal = undefined

      debugPreview('Closed puppeteer instance')
    }
  }

  private get browserManager() {
    return this.options.browserManager
  }

  private createWindowObject(page: Page): Preview.Window {
    const window = new EventEmitter()

    page.on('close', () => window.emit('close'))

    return Object.assign(window, {
      page,
      close: async () => {
        try {
          debugPreview('Request to close a page: %o', page)
          return await page.close()

          /* c8 ignore start */
        } catch (e: any) {
          debugPreview('%O', e)

          // Ignore raising error if a target page has already close
          if (!e.message.includes('Target closed.')) throw e
        }
        /* c8 ignore stop */
      },
      load: async (uri: string) => {
        if (uri.startsWith('data:')) {
          // A data URI with a huge size may fail opening with a browser due to the limitation of URL length.
          // If received a data URI, try to open it with a converted Blob URL.
          debugPreview(
            'Loading page: Detected to load data URI. Try to convert to Blob URL and open it in the browser.'
          )

          const [response] = await Promise.all([
            page.waitForNavigation({
              timeout: 5000,
              waitUntil: 'domcontentloaded',
            }),
            page.evaluate(async (uri) => {
              const res = await fetch(uri, { cache: 'no-cache' })
              const blob = await res.blob()
              location.href = URL.createObjectURL(blob)
            }, uri),
          ])

          debugPreview('Loaded: %s', response?.url())
        } else {
          debugPreview('Loading page: %s', uri)
          await page.goto(uri, { timeout: 0, waitUntil: 'domcontentloaded' })
          debugPreview('Loaded: %s', uri)
        }

        await page.createCDPSession().then((session) => {
          session.send('Page.resetNavigationHistory').catch(() => {
            // No ops
          })
        })
      },
    })
  }

  private async createWindow() {
    debugPreview('Trying to create new window')

    try {
      return this.createWindowObject(
        await new Promise<Page>((res, rej) => {
          const pptr = this.puppeteer

          if (!pptr) {
            debugPreview('Ignored: Puppeteer instance is not available')
            return rej(false)
          }

          const id = nanoid()
          const idMatcher = (target: Target) => {
            debugPreview('Activated the window finder for %s.', id)

            if (target.type() === 'page') {
              const url = new URL(target.url())

              if (url.searchParams.get('__marp_cli_id') === id) {
                debugPreview('Found a target window with id: %s', id)
                pptr.off('targetcreated', idMatcher)

                void (async () => {
                  res((await target.page()) ?? (await target.asPage()))
                })()
              }
            }
          }

          pptr.on('targetcreated', idMatcher)

          // Open new window with specific identifier
          void (async () => {
            const [page] = await pptr.pages()

            debugPreview('Opening a new window... (id: %s)', id)

            await page.evaluate(
              `window.open('about:blank?__marp_cli_id=${id}', '', 'width=${this.options.width},height=${this.options.height}')`
            )
          })()
        }).then(async (page) => {
          const sizeCorrection = await page.evaluate(
            ([w, h]) => {
              const nw = w - window.innerWidth + w
              const nh = h - window.innerHeight + h

              window.resizeTo(nw, nh)
              return [nw, nh]
            },
            [this.options.width, this.options.height]
          )

          debugPreview('Apply window size correction: %o', sizeCorrection)
          debugPreview('Created new window: %s', page.url())

          return page
        })
      )
    } catch (e: unknown) {
      if (!e) return false
      throw e
    }
  }

  private async launch(): Promise<Preview.Window> {
    const browser = await this.browserManager.browserForPreview()

    this.puppeteerInternal = await browser.launch({
      args: [
        `--app=${emptyPageURI}`,
        `--window-size=${this.options.width},${this.options.height}`,
      ],
      defaultViewport: null,
      headless: process.env.NODE_ENV === 'test',
      ignoreDefaultArgs: ['--enable-automation'],
    })

    const handlePageOnClose = async () => {
      debugPreview('Page closed')

      const pagesCount = (await this.puppeteer?.pages())?.length ?? 0
      debugPreview('Remaining pages count: %d', pagesCount)

      if (pagesCount === 0) await this.exit()
    }

    this.puppeteerInternal.on('targetcreated', (target) => {
      debugPreview('Target created: %o', target.url())

      // NOTE: PDF viewer on headful Chrome may return `null`.
      target.page().then((page) => page?.on('close', handlePageOnClose))
    })

    const [page] = await this.puppeteerInternal.pages()
    await page.goto(emptyPageURI, { waitUntil: 'domcontentloaded' })

    let windowObject: Preview.Window | undefined

    /* c8 ignore start */
    if (process.platform === 'darwin') {
      // An initial app window is not using in macOS for correct handling activation from Dock
      windowObject = (await this.createWindow()) || undefined
      await page.close()
    }
    /* c8 ignore stop */

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

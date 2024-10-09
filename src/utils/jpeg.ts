import { Browser } from '../browser/browser'
import { debug } from './debug'

export const png2jpegViaPuppeteer = async (
  browser: Browser,
  pngBuffer: Uint8Array,
  quality?: number
) =>
  await browser.withPage(async (page) => {
    debug('Converting PNG to JPEG via Puppeteer')

    await page.goto('data:text/html,', {
      waitUntil: ['domcontentloaded', 'networkidle0'],
    })

    const jpegDataURL = await page.evaluate(
      async (pngUri, q, timeout) => {
        // This function is executed outside of Jest's scope so we have to ignore coverage.
        // https://jestjs.io/docs/puppeteer
        /* c8 ignore start */
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx)
          throw new Error(
            'Failed to prepare canvas context for converting to JPEG'
          )

        const img = new Image()

        await Promise.race([
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => {
              canvas.width = img.width
              canvas.height = img.height
              ctx.drawImage(img, 0, 0)
              resolve()
            })
            img.src = pngUri
          }),
          new Promise<void>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Failed to convert PNG to JPEG due to timeout'))
            }, timeout)
          }),
        ])

        return canvas.toDataURL('image/jpeg', q)
        /* c8 ignore end */
      },
      `data:image/png;base64,${Buffer.from(pngBuffer).toString('base64')}`,
      quality,
      browser.timeout
    )

    if (!jpegDataURL.startsWith('data:image/jpeg;base64,'))
      throw new Error('Failed to convert PNG to JPEG')

    return Buffer.from(jpegDataURL.slice(23), 'base64')
  })

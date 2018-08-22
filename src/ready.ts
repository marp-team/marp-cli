import { marpBrowser } from '@marp-team/marp-core/package.json'
import fs from 'fs'
import path from 'path'

export type ReadyScriptResolver = () => Promise<string>

export class MarpReadyScript {
  static bundled: ReadyScriptResolver = async () => {
    const bundlePath = path.resolve(
      __dirname,
      '../node_modules/@marp-team/marp-core/',
      marpBrowser
    )

    const bundleJS = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(bundlePath, (e, data) => (e ? reject(e) : resolve(data)))
    )

    return `<script defer>${bundleJS.toString()}</script>`
  }

  static cdn: ReadyScriptResolver = async () =>
    `<script defer src="https://cdn.jsdelivr.net/npm/@marp-team/marp-core/${marpBrowser}"></script>`
}

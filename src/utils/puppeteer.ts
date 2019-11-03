import os from 'os'
import path from 'path'
import { LaunchOptions } from 'puppeteer-core'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'

let executablePath: string | undefined | false = false

interface PuppeteerLaunchArgs {
  profile?: string
}

export function generatePuppeteerLaunchArgs({
  profile,
}: PuppeteerLaunchArgs = {}): Partial<LaunchOptions> {
  // Resolve Chrome path to execute
  if (executablePath === false) {
    const finder: (() => string[]) | undefined = (() => {
      // Use already known path within Marp CLI official Docker image
      if (process.env.IS_DOCKER) return () => ['/usr/bin/chromium-browser']

      // Use Chrome installed to Windows within WSL
      if (require('is-wsl')) return chromeFinder.wsl

      return chromeFinder[process.platform]
    })()

    executablePath = finder ? finder()[0] : undefined
  }

  const ret: Partial<LaunchOptions> = { executablePath }

  // Specify data directories (Chrome on WSL cannot execute with undefined)
  if (profile) ret.userDataDir = path.resolve(os.tmpdir(), profile)

  return ret
}

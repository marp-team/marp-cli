import os from 'os'
import path from 'path'
import { LaunchOptions } from 'puppeteer-core'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'

interface PuppeteerLaunchArgs {
  profile?: string
}

let executablePath: string | undefined | false = false
let isWsl: boolean | undefined

function isWSL() {
  if (isWsl === undefined) isWsl = require('is-wsl')
  return isWsl
}

export function generatePuppeteerLaunchArgs({
  profile,
}: PuppeteerLaunchArgs = {}): Partial<LaunchOptions> {
  const args = new Set<string>()
  if (process.env.IS_DOCKER || isWSL()) args.add('--no-sandbox')

  // Workaround for Chrome 73 in docker and unit testing with CircleCI
  // https://github.com/GoogleChrome/puppeteer/issues/3774
  if (process.env.IS_DOCKER || process.env.CI)
    args.add('--disable-features=VizDisplayCompositor')

  // Resolve Chrome path to execute
  if (executablePath === false) {
    const finder: (() => string[]) | undefined = (() => {
      // Use already known path within Marp CLI official Docker image
      if (process.env.IS_DOCKER) return () => ['/usr/bin/chromium-browser']

      // Use Chrome installed to Windows within WSL
      if (isWSL()) return chromeFinder.wsl

      return chromeFinder[process.platform]
    })()

    executablePath = finder ? finder()[0] : undefined
  }

  const ret: Partial<LaunchOptions> = { executablePath }

  // Specify data directories (Chrome on WSL must speficy to avoid failing cleanup)
  if (profile) ret.userDataDir = path.resolve(os.tmpdir(), profile)

  return { ...ret, args: [...args] }
}

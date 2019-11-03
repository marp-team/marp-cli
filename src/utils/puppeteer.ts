import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import path from 'path'
import { LaunchOptions } from 'puppeteer-core'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'

const execPromise = promisify(exec)

let executablePath: string | undefined | false = false
let isWsl: boolean | undefined

export function isWSL(): boolean {
  if (isWsl === undefined) isWsl = require('is-wsl') as boolean
  return isWsl
}

export const resolveWSLPath = async (path: string): Promise<string> =>
  (await execPromise(`wslpath -m ${path.replace(/\\/g, '\\\\')}`)).stdout.trim()

export const generatePuppeteerDataDirPath = async (
  name: string
): Promise<string> => {
  let userDataDir: string = path.resolve(os.tmpdir(), name)
  if (isWSL()) userDataDir = await resolveWSLPath(userDataDir)

  return userDataDir
}

export async function generatePuppeteerLaunchArgs(): Promise<
  Partial<LaunchOptions>
> {
  // Puppeteer >= v1.13.0 doesn't use BGPT due to crbug.com/937609.
  // https://github.com/GoogleChrome/puppeteer/blob/master/lib/Launcher.js
  //
  // But it causes invalid rendering in Marp's `inlineSVG` mode. So we override
  // `--disable-features` option to prevent disabling BGPT.
  const args = new Set<string>(['--disable-features=TranslateUI'])

  // Docker environment and WSL environment need to disable sandbox. :(
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

  return {
    executablePath,
    ignoreDefaultArgs: ['--disable-features=TranslateUI,BlinkGenPropertyTrees'],
    args: [...args],
  }
}

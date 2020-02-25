import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import path from 'path'
import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'

const execPromise = promisify(exec)

let executablePath: string | undefined | false = false
let isWsl: boolean | undefined
let wslTmp: string | undefined

export function isWSL(): boolean {
  if (isWsl === undefined) isWsl = require('is-wsl') as boolean
  return isWsl
}

export const resolveWSLPath = async (path: string): Promise<string> =>
  (await execPromise(`wslpath -m ${path.replace(/\\/g, '\\\\')}`)).stdout.trim()

export const generatePuppeteerDataDirPath = async (
  name: string
): Promise<string> => {
  if (isWSL()) {
    // In WSL environment, Marp CLI will use Chrome on Windows. Thus, we have to
    // specify Windows path when converting within WSL.
    if (wslTmp === undefined) {
      const tmpRet = (await execPromise('cmd.exe /c SET TMP')).stdout.trim()
      if (tmpRet.startsWith('TMP=')) wslTmp = tmpRet.slice(4)
    }
    if (wslTmp !== undefined) {
      return path.win32.resolve(wslTmp, name)
    }
  }
  return path.resolve(os.tmpdir(), name)
}

export async function generatePuppeteerLaunchArgs() {
  const args = new Set<string>()

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

  return { executablePath, args: [...args] }
}

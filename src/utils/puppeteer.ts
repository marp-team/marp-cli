import { exec } from 'child_process'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { Launcher } from 'chrome-launcher'
import { CLIError } from '../error'

const execPromise = promisify(exec)

let executablePath: string | undefined | false = false
let isWsl: boolean | undefined
let wslTmp: string | undefined

export function isWSL(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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

export const generatePuppeteerLaunchArgs = () => {
  const args = new Set<string>()

  // Docker environment and WSL environment need to disable sandbox. :(
  if (process.env.IS_DOCKER || isWSL()) args.add('--no-sandbox')

  // Workaround for Chrome 73 in docker and unit testing with CircleCI
  // https://github.com/GoogleChrome/puppeteer/issues/3774
  if (process.env.IS_DOCKER || process.env.CI)
    args.add('--disable-features=VizDisplayCompositor')

  // Resolve Chrome path to execute
  if (executablePath === false) {
    if (process.env.IS_DOCKER) {
      // Use already known path within Marp CLI official Docker image
      executablePath = '/usr/bin/chromium-browser'
    } else {
      ;[executablePath] = Launcher.getInstallations()
    }

    if (!executablePath) {
      throw new CLIError(
        'You have to install Google Chrome or Chromium to convert slide deck with current options.'
      )
    }
  }

  return {
    executablePath,
    args: [...args],

    // Workaround to avoid force-extensions policy for Chrome enterprise (SET CHROME_ENABLE_EXTENSIONS=1)
    // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-windows
    //
    // @see https://github.com/marp-team/marp-cli/issues/231
    ignoreDefaultArgs: process.env.CHROME_ENABLE_EXTENSIONS
      ? ['--disable-extensions']
      : undefined,
  }
}

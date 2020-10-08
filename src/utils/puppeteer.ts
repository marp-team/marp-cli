import os from 'os'
import path from 'path'
import { Launcher } from 'chrome-launcher'
import { warn } from '../cli'
import { CLIErrorCode, error } from '../error'
import { findEdgeInstallation } from './edge-finder'
import { isWSL, resolveWindowsEnv } from './wsl'

let executablePath: string | undefined | false = false
let wslTmp: string | undefined

export const generatePuppeteerDataDirPath = async (
  name: string
): Promise<string> => {
  if (isWSL()) {
    // In WSL environment, Marp CLI will use Chrome on Windows. Thus, we have to
    // specify Windows path when converting within WSL.
    if (wslTmp === undefined) wslTmp = await resolveWindowsEnv('TMP')
    if (wslTmp !== undefined) return path.win32.resolve(wslTmp, name)
  }
  return path.resolve(os.tmpdir(), name)
}

export const generatePuppeteerLaunchArgs = () => {
  const args = new Set<string>(['--export-tagged-pdf'])

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
      try {
        ;[executablePath] = Launcher.getInstallations()
      } catch (e) {
        if (e instanceof Error) warn(e.message)
      }
    }

    if (!executablePath) {
      // Find Edge as fallback (Edge has pre-installed to almost Windows)
      executablePath = findEdgeInstallation()

      if (!executablePath) {
        error(
          'You have to install Google Chrome or Chromium to convert slide deck with current options.',
          CLIErrorCode.NOT_FOUND_CHROMIUM
        )
      }
    }
  }

  return {
    executablePath,
    args: [...args],
    pipe: !isWSL(),

    // Workaround to avoid force-extensions policy for Chrome enterprise (SET CHROME_ENABLE_EXTENSIONS=1)
    // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-windows
    //
    // @see https://github.com/marp-team/marp-cli/issues/231
    ignoreDefaultArgs: process.env.CHROME_ENABLE_EXTENSIONS
      ? ['--disable-extensions']
      : undefined,
  }
}

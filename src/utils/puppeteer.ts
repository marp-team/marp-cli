import fs from 'fs'
import os from 'os'
import path from 'path'
import { launch } from 'puppeteer-core'
import macDockIcon from '../assets/mac-dock-icon.png'
import { warn } from '../cli'
import { CLIErrorCode, error, isError } from '../error'
import { isDocker } from '../utils/docker'
import { findChromeInstallation } from './chrome-finder'
import { findEdgeInstallation } from './edge-finder'
import { isWSL, resolveWindowsEnv } from './wsl'

let executablePath: string | undefined | false = false
let wslTmp: string | undefined

export const enableHeadless = (): true | 'new' =>
  process.env.PUPPETEER_HEADLESS_MODE?.toLowerCase() === 'new' ? 'new' : true

const isShebang = (path: string) => {
  let fd: number | null = null

  try {
    fd = fs.openSync(path, 'r')

    const shebangBuffer = Buffer.alloc(2)
    fs.readSync(fd, shebangBuffer, 0, 2, 0)

    if (shebangBuffer[0] === 0x23 && shebangBuffer[1] === 0x21) return true
  } catch (e: unknown) {
    // no ops
  } finally {
    if (fd !== null) fs.closeSync(fd)
  }
  return false
}

const isSnapBrowser = (executablePath: string | undefined) => {
  if (process.platform === 'linux' && executablePath) {
    // Snapd binary
    if (executablePath.startsWith('/snap/')) return true

    // Check the content of shebang script (for alias script installed by apt)
    if (isShebang(executablePath)) {
      const scriptContent = fs.readFileSync(executablePath, 'utf8')
      if (scriptContent.includes('/snap/')) return true
    }
  }
  return false
}

export const generatePuppeteerDataDirPath = async (
  name: string,
  { wslHost }: { wslHost?: boolean } = {}
): Promise<string> => {
  const dataDir = await (async () => {
    if (isWSL() && wslHost) {
      // In WSL environment, Marp CLI may use Chrome on Windows. If Chrome has
      // located in host OS (Windows), we have to specify Windows path.
      if (wslTmp === undefined) wslTmp = await resolveWindowsEnv('TMP')
      if (wslTmp !== undefined) return path.win32.resolve(wslTmp, name)
    }
    return path.resolve(os.tmpdir(), name)
  })()

  // Ensure the data directory is created
  try {
    await fs.promises.mkdir(dataDir, { recursive: true })
  } catch (e: unknown) {
    if (isError(e) && e.code !== 'EEXIST') throw e
  }

  return dataDir
}

export const generatePuppeteerLaunchArgs = async () => {
  const args = new Set<string>(['--export-tagged-pdf', '--test-type'])

  // Docker environment and WSL environment need to disable sandbox. :(
  if (isDocker() || isWSL()) args.add('--no-sandbox')

  // Workaround for Chrome 73 in docker and unit testing with CircleCI
  // https://github.com/GoogleChrome/puppeteer/issues/3774
  if (isDocker() || process.env.CI)
    args.add('--disable-features=VizDisplayCompositor')

  // Enable View transitions API
  if (!process.env.CI) args.add('--enable-blink-features=ViewTransition')

  // LayoutNG Printing
  if (process.env.CHROME_LAYOUTNG_PRINTING)
    args.add(
      '--enable-blink-features=LayoutNGPrinting,LayoutNGTableFragmentation'
    )

  // Resolve Chrome path to execute
  if (executablePath === false) {
    let findChromeError: Error | undefined

    try {
      executablePath = await findChromeInstallation()
    } catch (e: unknown) {
      if (isError(e)) findChromeError = e
    }

    if (!executablePath) {
      // Find Edge as fallback (Edge has pre-installed to almost Windows)
      executablePath = findEdgeInstallation()

      if (!executablePath) {
        if (findChromeError) warn(findChromeError.message)

        // https://github.com/marp-team/marp-cli/issues/475
        // https://github.com/GoogleChrome/chrome-launcher/issues/278
        const chromiumResolvable = process.platform === 'linux'

        error(
          `You have to install Google Chrome${
            chromiumResolvable ? ', Chromium,' : ''
          } or Microsoft Edge to convert slide deck with current options.`,
          CLIErrorCode.NOT_FOUND_CHROMIUM
        )
      }
    }
  }

  return {
    executablePath,
    args: [...args],
    pipe: !(isWSL() || isSnapBrowser(executablePath)),
    headless: enableHeadless(),

    // Workaround to avoid force-extensions policy for Chrome enterprise (SET CHROME_ENABLE_EXTENSIONS=1)
    // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-windows
    //
    // @see https://github.com/marp-team/marp-cli/issues/231
    ignoreDefaultArgs: process.env.CHROME_ENABLE_EXTENSIONS
      ? ['--disable-extensions']
      : undefined,
  }
}

export const launchPuppeteer = async (
  ...[options]: Parameters<typeof launch>
) => {
  try {
    const browser = await launch(options)

    // Set Marp icon asynchrnously (only for macOS)
    /* c8 ignore start */
    browser
      ?.target()
      .createCDPSession()
      .then((session) => {
        session
          .send('Browser.setDockTile', { image: macDockIcon.slice(22) })
          .catch(() => {
            // No ops
          })
      })
    /* c8 ignore stop */

    return browser
  } catch (e: unknown) {
    if (isError(e)) {
      // Retry to launch Chromium with WebSocket connection instead of pipe if failed to connect to Chromium
      // https://github.com/puppeteer/puppeteer/issues/6258
      if (options?.pipe && e.message.includes('Target.setDiscoverTargets')) {
        return await launch({ ...options, pipe: false })
      }

      // Warning when tried to spawn the snap chromium within the snapd container
      // (e.g. Terminal in VS Code installed by snap + chromium installed by apt)
      // It would be resolved by https://github.com/snapcore/snapd/pull/10029 but there is no progress :(
      if (
        options?.executablePath &&
        isSnapBrowser(options.executablePath) &&
        /^need to run as root or suid$/im.test(e.message)
      ) {
        error(
          'Marp CLI has detected trying to spawn Chromium browser installed by snap, from the confined environment like another snap app. At least either of Chrome/Chromium or the shell environment must be non snap app.',
          CLIErrorCode.CANNOT_SPAWN_SNAP_CHROMIUM
        )
      }
    }
    throw e
  }
}

export const resetExecutablePath = () => {
  executablePath = false
}

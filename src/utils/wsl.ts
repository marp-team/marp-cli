import { execFile as cpExecFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import { debug } from './debug'

const execFile = promisify(cpExecFile)
const resolveStdout = ({ stdout }: { stdout: string }) => stdout.trim()

export const translateWSLPathToWindows = async (wslPath: string) =>
  await execFile('wslpath', ['-m', wslPath]).then(resolveStdout)

export const translateWindowsPathToWSL = async (winPath: string) =>
  await execFile('wslpath', ['-u', winPath]).then(resolveStdout)

export const getWindowsEnv = async (envName: string) => {
  const ret = await execFile('cmd.exe', ['/c', 'SET', envName]).then(
    resolveStdout
  )
  if (ret.startsWith(`${envName}=`)) return ret.slice(envName.length + 1)
  return undefined
}

let isWsl: number | Promise<number> | undefined
const wsl2VerMatcher = /microsoft-standard-wsl2/i

export const isWSL = async (): Promise<number> => {
  if (isWsl === undefined) {
    isWsl = (async () => {
      if ((await import('is-wsl')).default) {
        // Detect whether WSL version is 2
        // https://github.com/microsoft/WSL/issues/4555#issuecomment-700213318
        const isWSL2 = await (async () => {
          if (process.env.WSL_DISTRO_NAME && process.env.WSL_INTEROP)
            return true

          try {
            const verStr = await fs.promises.readFile('/proc/version', 'utf8')
            if (wsl2VerMatcher.test(verStr)) return true

            const gccMatched = verStr.match(/gcc[^,]+?(\d+)\.\d+\.\d+/)
            if (gccMatched && Number.parseInt(gccMatched[1], 10) >= 8)
              return true
          } catch (e) {
            debug('Error while detecting WSL version: %o', e)
            debug('Assuming current WSL version is the primary version 2')
            return true
          }
        })()

        const wslVersion = isWSL2 ? 2 : 1
        debug('Detected WSL version: %s', wslVersion)

        return wslVersion
      } else {
        return 0
      }
    })().then((correctedIsWsl) => (isWsl = correctedIsWsl))
  }
  return await isWsl
}

import { execFile, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { debug } from './debug'

let isWsl: number | Promise<number> | undefined

export const resolveWSLPathToHost = async (path: string): Promise<string> =>
  await new Promise<string>((res, rej) => {
    execFile('wslpath', ['-m', path], (err, stdout) =>
      err ? rej(err) : res(stdout.trim())
    )
  })

export const resolveWSLPathToGuestSync = (path: string): string =>
  spawnSync('wslpath', ['-u', path]).stdout.toString().trim()

export const resolveWindowsEnv = async (
  key: string
): Promise<string | undefined> => {
  const ret = await new Promise<string>((res, rej) => {
    execFile('cmd.exe', ['/c', 'SET', key], (err, stdout) =>
      err ? rej(err) : res(stdout.trim())
    )
  })

  return ret.startsWith(`${key}=`) ? ret.slice(key.length + 1) : undefined
}

export const resolveWindowsEnvSync = (key: string): string | undefined => {
  const ret = spawnSync('cmd.exe', ['/c', 'SET', key]).stdout.toString().trim()
  return ret.startsWith(`${key}=`) ? ret.slice(key.length + 1) : undefined
}

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
          } catch {
            // no ops
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

export const isChromeInWSLHost = async (chromePath: string | undefined) =>
  !!((await isWSL()) && chromePath?.match(/^\/mnt\/[a-z]\//))

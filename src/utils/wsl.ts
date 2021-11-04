import { execFile, spawnSync } from 'child_process'
import { readFileSync } from 'fs'

let isWsl: number | undefined

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

export const isWSL = (): number => {
  if (isWsl === undefined) {
    if (require('is-wsl')) {
      isWsl = 1

      try {
        // https://github.com/microsoft/WSL/issues/423#issuecomment-611086412
        const release = readFileSync('/proc/sys/kernel/osrelease').toString()
        if (release.includes('WSL2')) isWsl = 2
      } catch (e: unknown) {
        // no ops
      }
    } else {
      isWsl = 0
    }
  }
  return isWsl
}

export const isChromeInWSLHost = (chromePath: string | undefined) =>
  !!(isWSL() && chromePath?.match(/^\/mnt\/[a-z]\//))

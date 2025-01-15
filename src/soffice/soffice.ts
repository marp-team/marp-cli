import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import chalk from 'chalk'
import { nanoid } from 'nanoid'
import { error } from '../cli'
import { debug } from '../utils/debug'
import { createMemoizedPromiseContext } from '../utils/memoized-promise'
import { getWindowsEnv, isWSL, translateWindowsPathToWSL } from '../utils/wsl'
import { findSOffice } from './finder'

const wslHostMatcher = /^\/mnt\/[a-z]\//

let wslTmp: string | undefined

export interface SOfficeOptions {
  path?: string
}

export class SOffice {
  preferredPath?: string
  #profileDirName: string

  private _path = createMemoizedPromiseContext<string>()
  private _profileDir = createMemoizedPromiseContext<string>()

  private static _spawnQueue: Promise<void> = Promise.resolve()

  constructor(opts: SOfficeOptions = {}) {
    this.#profileDirName = `marp-cli-soffice-${nanoid(10)}`
    this.preferredPath = opts.path
  }

  get path(): Promise<string> {
    return this._path.init(
      async () =>
        (await findSOffice({ preferredPath: this.preferredPath })).path
    )
  }

  get profileDir(): Promise<string> {
    return this._profileDir.init(async () => await this.setProfileDir())
  }

  async spawn(args: string[]) {
    return new Promise<void>((resolve, reject) => {
      SOffice._spawnQueue = SOffice._spawnQueue
        .then(async () => {
          const spawnArgs = [
            `-env:UserInstallation=${pathToFileURL(await this.profileDir).toString()}`,
            ...args,
          ]

          debug(`[soffice] Spawning soffice with args: %o`, spawnArgs)

          const childProcess = spawn(await this.path, spawnArgs, {
            stdio: 'pipe',
          })

          childProcess.stdout.on('data', (data) => {
            debug(`[soffice:stdout] %s`, data.toString())
          })

          childProcess.stderr.on('data', (data) => {
            const output = data.toString()

            debug(`[soffice:stderr] %s`, output)
            error(`${chalk.yellow`[soffice]`} ${output.trim()}`, {
              singleLine: true,
            })
          })

          return new Promise<void>((resolve, reject) => {
            childProcess.on('close', (code) => {
              debug(`[soffice] soffice exited with code %d`, code)

              if (code === 0) {
                resolve()
              } else {
                reject(new Error(`soffice exited with code ${code}.`))
              }
            })
          })
        })
        .then(resolve, reject)
    })
  }

  private async binaryInWSLHost(): Promise<boolean> {
    return !!(await isWSL()) && wslHostMatcher.test(await this.path)
  }

  private async setProfileDir(): Promise<string> {
    let needToTranslateWindowsPathToWSL = false

    const dir = await (async () => {
      // In WSL environment, Marp CLI may use Chrome on Windows. If Chrome has
      // located in host OS (Windows), we have to specify Windows path.
      if (await this.binaryInWSLHost()) {
        if (wslTmp === undefined) wslTmp = await getWindowsEnv('TMP')
        if (wslTmp !== undefined) {
          needToTranslateWindowsPathToWSL = true
          return path.win32.resolve(wslTmp, this.#profileDirName)
        }
      }
      return path.resolve(os.tmpdir(), this.#profileDirName)
    })()

    debug(`soffice data directory: %s`, dir)

    // Ensure the data directory is created
    const mkdirPath = needToTranslateWindowsPathToWSL
      ? await translateWindowsPathToWSL(dir)
      : dir

    await fs.promises.mkdir(mkdirPath, { recursive: true })
    debug(`Created data directory: %s`, mkdirPath)

    return dir
  }
}

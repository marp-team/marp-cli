import { execFile as cpExecFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { nanoid } from 'nanoid'
import { debug } from '../utils/debug'
import { getWindowsEnv, isWSL, translateWindowsPathToWSL } from '../utils/wsl'
import { findSOffice } from './finder'

const execFile = promisify(cpExecFile)
const wslHostMatcher = /^\/mnt\/[a-z]\//

let wslTmp: string | undefined

export interface SOfficeOptions {
  path?: string
}

export class SOffice {
  preferredPath?: string
  #profileDirName: string

  private _path?: string
  private _profileDir?: string

  constructor(opts: SOfficeOptions = {}) {
    this.#profileDirName = `marp-cli-soffice-${nanoid(10)}`
    this.preferredPath = opts.path
  }

  get path(): Promise<string> {
    if (this._path) return Promise.resolve(this._path)

    return (async () => {
      const found = await findSOffice({ preferredPath: this.preferredPath })

      this._path = found.path
      return found.path
    })()
  }

  get profileDir(): Promise<string> {
    if (this._profileDir) return Promise.resolve(this._profileDir)

    return this.setProfileDir()
  }

  async exec(args: string[]) {
    return await execFile(await this.path, [
      `-env:UserInstallation=${pathToFileURL(await this.profileDir).toString()}`,
      ...args,
    ])
  }

  private async binaryInWSLHost(): Promise<boolean> {
    return !!(await isWSL()) && wslHostMatcher.test(await this.path)
  }

  private async setProfileDir(): Promise<string> {
    let needToTranslateWindowsPathToWSL = false

    this._profileDir = await (async () => {
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

    debug(`soffice data directory: %s`, this._profileDir)

    // Ensure the data directory is created
    const mkdirPath = needToTranslateWindowsPathToWSL
      ? await translateWindowsPathToWSL(this._profileDir)
      : this._profileDir

    await fs.promises.mkdir(mkdirPath, { recursive: true })
    debug(`Created data directory: %s`, mkdirPath)

    return this._profileDir
  }
}

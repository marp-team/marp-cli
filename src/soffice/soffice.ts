import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import chalk from 'chalk'
import { nanoid } from 'nanoid'
import { warn } from '../cli'
import { debug } from '../utils/debug'
import { createMemoizedPromiseContext } from '../utils/memoized-promise'
import { findSOffice } from './finder'

export interface SOfficeOptions {
  path?: string
}

export interface SOfficeProfileDir {
  path: string
  fileURL: string
}

export class SOffice {
  preferredPath?: string
  #profileDirName: string

  private _path = createMemoizedPromiseContext<string>()
  private _profileDir = createMemoizedPromiseContext<SOfficeProfileDir>()

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

  get profileDir(): Promise<SOfficeProfileDir> {
    return this._profileDir.init(async () => await this.setProfileDir())
  }

  async spawn(args: string[]) {
    return new Promise<void>((resolve, reject) => {
      SOffice._spawnQueue = SOffice._spawnQueue
        .then(async () => {
          const spawnArgs = [
            `-env:UserInstallation=${(await this.profileDir).fileURL}`,
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
            warn(`${chalk.yellow`[soffice]`} ${output.trim()}`, {
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

  private async setProfileDir(): Promise<SOfficeProfileDir> {
    const dir = path.resolve(os.tmpdir(), this.#profileDirName)
    debug(`soffice data directory: %s`, dir)

    await fs.promises.mkdir(dir, { recursive: true })
    debug(`soffice data directory created: %s`, dir)

    return { path: dir, fileURL: pathToFileURL(dir).toString() }
  }
}

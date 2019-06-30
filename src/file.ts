import fs from 'fs'
import getStdin from 'get-stdin'
import globby from 'globby'
import mkdirp from 'mkdirp'
import path from 'path'
import * as url from 'url'
import { tmpName } from 'tmp'
import { promisify } from 'util'

const stat = promisify(fs.stat)
const mkdirpPromise = promisify<string, any>(mkdirp)
const readFile = promisify(fs.readFile)
const tmpNamePromise = promisify(tmpName)
const unlink = promisify(fs.unlink)
const writeFile = promisify(fs.writeFile)

export const markdownExtensions = ['md', 'mdown', 'markdown', 'markdn']

export enum FileType {
  File,
  StandardIO,
  Null,
}

export class File {
  buffer?: Buffer
  inputDir?: string
  type: FileType = FileType.File
  readonly path: string

  constructor(filepath: string) {
    this.path = filepath
  }

  get absolutePath(): string {
    return path.resolve(this.path)
  }

  get absoluteFileScheme(): string {
    if (url.pathToFileURL)
      return url.pathToFileURL(this.absolutePath).toString()

    // Fallback for Node < v10.12.0
    return `file://${path.posix.resolve(this.path)}`
  }

  convert(output: string | false | undefined, extension: string): File {
    switch (output) {
      case undefined:
        return File.initialize(
          this.convertExtension(extension),
          f => (f.type = this.type)
        )
      case false:
        return File.initialize(this.path, f => (f.type = FileType.Null))
      case '-':
        return File.initialize('-', f => (f.type = FileType.StandardIO))
    }

    if (this.inputDir)
      return File.initialize(
        this.convertExtension(
          extension,
          path.join(output, this.relativePath(this.inputDir))
        )
      )

    return File.initialize(output)
  }

  async load() {
    this.buffer = this.buffer || (await readFile(this.path))
    return this.buffer
  }

  relativePath(from: string = process.cwd()) {
    return path.relative(from, this.absolutePath)
  }

  async save() {
    switch (this.type) {
      case FileType.File:
        await this.saveToFile()
        break
      case FileType.StandardIO:
        process.stdout.write(this.buffer!)
    }
  }

  async saveTmpFile(ext?: string): Promise<File.TmpFileInterface> {
    const tmp: string = await tmpNamePromise({ postfix: ext })
    await this.saveToFile(tmp)

    return {
      cleanup: async () => {
        try {
          await this.cleanup(tmp)
        } catch (e) {}
      },
      path: tmp,
    }
  }

  private cleanup(tmpPath: string) {
    return unlink(tmpPath)
  }

  private convertExtension(extension: string, basePath = this.path): string {
    return path.join(
      path.dirname(basePath),
      `${path.basename(basePath, path.extname(basePath))}.${extension}`
    )
  }

  private async saveToFile(savePath: string = this.path) {
    await mkdirpPromise(path.dirname(path.resolve(savePath)))
    await writeFile(savePath, this.buffer)
  }

  private static stdinBuffer?: Buffer

  static async find(...pathes: string[]): Promise<File[]> {
    const filepathes = new Set<string>()
    const globs: string[] = []

    // Collect passed files that refers to a real path at first
    for (const p of pathes) {
      try {
        const s: fs.Stats = await stat(p)

        if (s.isFile()) {
          filepathes.add(path.resolve(p))
          continue
        }
      } catch (e) {}

      globs.push(p)
    }

    // Find remaining path through globby
    ;(await globby(globs, {
      absolute: true,
      expandDirectories: {
        extensions: [],
        files: markdownExtensions.map(ext => `*.${ext}`),
      },
      ignore: ['**/node_modules'],
    })).forEach(p => filepathes.add(p))

    return [...filepathes.values()].map(p => new File(p))
  }

  static async findDir(directory: string): Promise<File[]> {
    const found = await this.find(directory)
    found.forEach(p => (p.inputDir = path.resolve(directory)))

    return found
  }

  static async stdin(): Promise<File | undefined> {
    this.stdinBuffer = this.stdinBuffer || (await getStdin.buffer())
    if (this.stdinBuffer.length === 0) return undefined

    return this.initialize('-', f => {
      f.buffer = this.stdinBuffer
      f.type = FileType.StandardIO
    })
  }

  private static initialize(
    filepath: string,
    tap: (instance: File) => void = () => {}
  ) {
    const instance = new this(filepath)
    tap(instance)
    return instance
  }
}

export namespace File {
  export interface TmpFileInterface {
    path: string
    cleanup: () => Promise<void>
  }
}

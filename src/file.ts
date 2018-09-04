import fs from 'fs'
import getStdin from 'get-stdin'
import globby from 'globby'
import path from 'path'
import { tmpName } from 'tmp'

const markdownExtensions = ['*.md', '*.mdown', '*.markdown', '*.markdn']

export enum FileType {
  File,
  StandardIO,
}

export class File {
  buffer?: Buffer
  type: FileType = FileType.File
  readonly path: string

  constructor(filepath: string) {
    this.path = filepath
  }

  get absolutePath() {
    return path.resolve(this.path)
  }

  convert(output: string | undefined, extension: string): File {
    if (output === undefined)
      return File.initialize(
        this.convertExtension(extension),
        f => (f.type = this.type)
      )

    if (output === '-')
      return File.initialize('-', f => (f.type = FileType.StandardIO))

    return File.initialize(output)
  }

  async load() {
    this.buffer =
      this.buffer ||
      (await new Promise<Buffer>((resolve, reject) =>
        fs.readFile(this.path, (e, buf) => (e ? reject(e) : resolve(buf)))
      ))

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
    const path: string = await new Promise<string>((resolve, reject) => {
      tmpName({ postfix: ext }, (e, path) => (e ? reject(e) : resolve(path)))
    })

    await this.saveToFile(path)

    return {
      path,
      cleanup: async () => {
        try {
          await this.cleanup(path)
        } catch (e) {}
      },
    }
  }

  private async cleanup(path: string) {
    return new Promise<void>((resolve, reject) =>
      fs.unlink(path, e => (e ? reject(e) : resolve()))
    )
  }

  private convertExtension(extension: string): string {
    return path.join(
      path.dirname(this.path),
      `${path.basename(this.path, path.extname(this.path))}.${extension}`
    )
  }

  private async saveToFile(path: string = this.path) {
    return new Promise<void>((resolve, reject) =>
      fs.writeFile(path, this.buffer, e => (e ? reject(e) : resolve()))
    )
  }

  private static stdinBuffer?: Buffer

  static async find(...pathes: string[]): Promise<File[]> {
    return (await globby(pathes, {
      absolute: true,
      expandDirectories: { files: markdownExtensions },
    })).map(path => new File(path))
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

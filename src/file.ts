import fs from 'fs'
import getStdin from 'get-stdin'
import globby from 'globby'
import mkdirp from 'mkdirp'
import path from 'path'

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

  get directory() {
    return path.dirname(this.absolutePath)
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
        await new Promise<void>((resolve, reject) =>
          mkdirp(this.directory, e => (e ? reject(e) : resolve()))
        )
        await new Promise<void>((resolve, reject) =>
          fs.writeFile(this.path, this.buffer, e => (e ? reject(e) : resolve()))
        )
        break
      case FileType.StandardIO:
        process.stdout.write(this.buffer!)
    }
  }

  private convertExtension(extension: string): string {
    return path.join(
      path.dirname(this.path),
      `${path.basename(this.path, path.extname(this.path))}.${extension}`
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

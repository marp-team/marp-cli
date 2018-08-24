import fs from 'fs'
import getStdin from 'get-stdin'
import globby from 'globby'
import path from 'path'

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
    // Convert filename
    if (output === undefined) {
      const file = new File(this.convertExtension(extension))
      file.type = this.type

      return file
    }

    // Output to stdout
    if (output === '-') {
      const file = new File('')
      file.type = FileType.StandardIO

      return file
    }

    return new File(output)
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
      expandDirectories: { files: ['*.md', '*.mdown', '*.markdown'] },
    })).map(path => new File(path))
  }

  static async stdin(): Promise<File | undefined> {
    this.stdinBuffer = this.stdinBuffer || (await getStdin.buffer())
    if (this.stdinBuffer.length === 0) return undefined

    const file = new File('-')

    file.buffer = this.stdinBuffer
    file.type = FileType.StandardIO

    return file
  }
}

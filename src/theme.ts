import fs from 'fs'
import globby from 'globby'

const themeExtensions = ['*.css']

export class Theme {
  readonly filename: string
  private readBuffer?: Buffer

  private constructor(filename: string) {
    this.filename = filename
  }

  get buffer() {
    return this.readBuffer!
  }

  get css() {
    return this.buffer.toString()
  }

  private async read() {
    this.readBuffer = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(this.filename, (e, buf) => (e ? reject(e) : resolve(buf)))
    )
  }

  static async create(filename: string) {
    const instance = new Theme(filename)
    await instance.read()

    return instance
  }

  static async find(from: string | string[]) {
    const pathes = await globby(from, {
      absolute: true,
      expandDirectories: { files: themeExtensions },
    })

    const instances: Theme[] = []
    for (const fn of pathes) instances.push(await this.create(fn))

    return instances
  }
}

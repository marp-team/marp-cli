import { Marpit } from '@marp-team/marpit'
import fs from 'fs'
import globby from 'globby'
import path from 'path'

const themeExtensions = ['*.css']

export class Theme {
  readonly filename: string
  name?: string

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

  async load() {
    this.readBuffer = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(this.filename, (e, buf) => (e ? reject(e) : resolve(buf)))
    )
  }

  static async initialize(filename: string) {
    const instance = new Theme(filename)
    await instance.load()

    return instance
  }
}

export class ThemeSet {
  readonly fn: string[]
  readonly fnForWatch: string[]

  /** The key-value pair from file path to instance */
  readonly themes: Map<string, Theme> = new Map()

  onThemeUpdated: (path: string) => void = () => {}

  private observedMarkdowns: Map<string, string | undefined> = new Map()

  private constructor(opts: { fn: string[]; fnForWatch: string[] }) {
    this.fn = opts.fn
    this.fnForWatch = opts.fnForWatch
  }

  async findPath() {
    return await ThemeSet.findPath(this.fn)
  }

  async load(fn: string) {
    const filename = path.resolve(fn)
    let theme = this.themes.get(filename)

    if (theme) {
      await theme.load()
    } else {
      theme = await Theme.initialize(filename)
      this.themes.set(filename, theme)
    }

    if (theme.name !== undefined) this.notify(theme.name)
  }

  observe(markdownPath: string, theme: string | undefined) {
    this.observedMarkdowns.set(markdownPath, theme)
  }

  registerTo(engine: Marpit) {
    for (const theme of this.themes.values()) {
      const engineTheme = engine.themeSet.add(theme.css)
      theme.name = engineTheme.name
    }
  }

  unobserve(markdownPath: string) {
    this.observedMarkdowns.delete(markdownPath)
  }

  private notify(theme: string) {
    this.observedMarkdowns.forEach((v, path) => {
      if (v === theme) this.onThemeUpdated(path)
    })
  }

  static async initialize(fn: string[]) {
    const found = await ThemeSet.findPath(fn)
    const fnForWatch: Set<string> = new Set(found.map(f => path.resolve(f)))

    for (const f of fn) {
      if (!globby.hasMagic(f)) {
        try {
          const stat = await new Promise<fs.Stats>((resolve, reject) =>
            fs.lstat(f, (e, stats) => (e ? reject(e) : resolve(stats)))
          )

          if (stat.isFile() || stat.isDirectory() || stat.isSymbolicLink())
            fnForWatch.add(path.resolve(f))
        } catch (e) {}
      }
    }

    const instance = new ThemeSet({ fn, fnForWatch: [...fnForWatch] })
    for (const f of found) await instance.load(f)

    return instance
  }

  private static async findPath(fn: string[]): Promise<string[]> {
    return await globby(fn, {
      absolute: true,
      expandDirectories: { files: themeExtensions },
    })
  }
}

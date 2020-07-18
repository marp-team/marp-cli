/* eslint-disable import/export, @typescript-eslint/no-namespace */
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Marpit } from '@marp-team/marpit'
import { hasMagic } from 'globby'
import { warn } from './cli'
import { File } from './file'

const lstat = promisify(fs.lstat)
const readFile = promisify(fs.readFile)

export class Theme {
  readonly filename: string
  readonly overrideName?: string
  name?: string

  private readBuffer?: Buffer

  private constructor(filename: string, opts: Theme.Options) {
    this.filename = filename
    this.overrideName =
      opts.overrideName === true ? this.genUniqName() : opts.overrideName

    this.name = this.overrideName
  }

  get buffer() {
    return this.readBuffer! // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  get css() {
    const buf = this.buffer.toString()

    return this.overrideName ? `${buf}\n/* @theme ${this.overrideName} */` : buf
  }

  async load() {
    this.readBuffer = await readFile(this.filename)
  }

  private genUniqName() {
    const uniq = () => Math.random().toString(36).slice(2)

    return `${uniq()}${uniq()}${uniq()}${uniq()}`
  }

  static async initialize(filename: string, opts: Theme.Options = {}) {
    const instance = new Theme(filename, opts)
    await instance.load()

    return instance
  }
}

export class ThemeSet {
  readonly fn: string[]
  readonly fnForWatch: string[]

  /** The key-value pair from file path to instance */
  readonly themes: Map<string, Theme> = new Map()

  onThemeUpdated: (path: string) => void = () => {
    // No ops
  }

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
      this.add(theme)
    }

    if (theme.name !== undefined) this.notify(theme.name)
  }

  observe(markdownPath: string, theme: string | undefined) {
    this.observedMarkdowns.set(markdownPath, theme)
  }

  registerTo(engine: Marpit) {
    for (const theme of this.themes.values()) {
      try {
        const engineTheme = engine.themeSet.add(theme.css)
        theme.name = engineTheme.name
      } catch (e) {
        const fn = path.relative(process.cwd(), theme.filename)
        warn(`Cannot register theme CSS: ${fn} (${e.message})`)
      }
    }
  }

  unobserve(markdownPath: string) {
    this.observedMarkdowns.delete(markdownPath)
  }

  private add(theme: Theme) {
    this.themes.set(theme.filename, theme)
  }

  private notify(theme: string) {
    this.observedMarkdowns.forEach((v, path) => {
      if (v === theme) this.onThemeUpdated(path)
    })
  }

  static async initialize(baseFn: string[], themes: Theme[] = []) {
    const fn = [...baseFn, ...themes.map((t) => t.filename)]
    const found = await ThemeSet.findPath(fn)
    const fnForWatch: Set<string> = new Set(found.map((f) => path.resolve(f)))

    for (const f of fn) {
      // globby's hasMagic (backed by fast-glob) always recognizes "\\" (Windows path separator) as the escape character.
      if (!hasMagic(f.split(path.sep).join('/'))) {
        try {
          const stat: fs.Stats = await lstat(f)

          if (stat.isFile() || stat.isDirectory() || stat.isSymbolicLink())
            fnForWatch.add(path.resolve(f))
        } catch (e) {
          // No ops
        }
      }
    }

    const instance = new ThemeSet({ fn, fnForWatch: [...fnForWatch] })
    for (const f of found) await instance.load(f)

    themes.forEach((t) => instance.add(t))

    return instance
  }

  private static async findPath(fn: string[]): Promise<string[]> {
    return File.findPath(
      {
        expandDirectories: {
          extensions: [],
          files: ['*.css'],
        },
      },
      ...fn
    )
  }
}

export namespace Theme {
  export interface Options {
    overrideName?: true | string
  }
}

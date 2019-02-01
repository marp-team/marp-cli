import express, { Express } from 'express'
import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import serveIndex from 'serve-index'
import url from 'url'
import { promisify } from 'util'
import { Converter, ConvertedCallback, ConvertType } from './converter'
import { error } from './error'
import { File, markdownExtensions } from './file'
import favicon from './assets/favicon.png'
import serverIndex from './server/index.pug'
import style from './server/index.scss'

const stat = promisify(fs.stat)
const readFile = promisify(fs.readFile)

export class Server {
  readonly converter: Converter
  readonly inputDir: string
  readonly options: Server.Options
  readonly port: Number

  directoryIndex: string[]
  server?: Express

  private static script: string | undefined

  constructor(converter: Converter, opts: Server.Options = {}) {
    if (!converter.options.inputDir)
      error('Converter have to specify an input directory.')

    this.converter = converter
    this.directoryIndex = opts.directoryIndex || []
    this.inputDir = converter.options.inputDir!
    this.options = opts
    this.port = Number.parseInt(process.env.PORT!, 10) || 8080
  }

  async start() {
    this.setup()
    new Promise<void>(res => this.server!.listen(this.port, res))
  }

  private async convertMarkdown(
    filename: string,
    query: querystring.ParsedUrlQuery = {}
  ) {
    const pdf = Object.keys(query).includes('pdf')
    const file = new File(filename)

    this.converter.options.output = false
    this.converter.options.type = pdf ? ConvertType.pdf : ConvertType.html

    const converted = await this.converter.convertFile(file)
    if (this.options.onConverted) this.options.onConverted(converted)

    return converted
  }

  private async loadScript() {
    if (Server.script === undefined) {
      Server.script = (await readFile(
        path.resolve(__dirname, './server/server-index.js')
      )).toString()
    }

    return Server.script
  }

  private async preprocess(req: express.Request, res: express.Response) {
    const { pathname, query } = url.parse(req.url)
    if (!pathname) return

    const qs = querystring.parse(query || '')
    const response = async fn =>
      res.end((await this.convertMarkdown(fn, qs)).newFile.buffer)

    const validated = await this.validateMarkdown(pathname)

    if (validated.valid) {
      await response(validated.path)
    } else {
      // Find default files from current directory
      if (validated.stats && validated.stats.isDirectory()) {
        for (const dirIdxFn of this.directoryIndex) {
          const dirIdxValidated = await this.validateMarkdown(
            path.join(path.relative(this.inputDir, validated.path), dirIdxFn)
          )

          if (dirIdxValidated.valid) {
            await response(dirIdxValidated.path)
            break
          }
        }
      }
    }
  }

  private setup() {
    this.server = express()
    this.server
      .get('*', (req, res, next) =>
        this.preprocess(req, res).then(() => {
          if (!res.finished) next()
        })
      )
      .use(express.static(this.inputDir))
      .use(serveIndex(this.inputDir, { template: this.template.bind(this) }))
  }

  private template(locals, callback) {
    const { directory, path, fileList } = locals
    const files: any[] = []
    ;(async () => {
      const script = await this.loadScript()

      for (const f of fileList) {
        const { name, stat } = f
        const directory = stat && stat.isDirectory()
        const parent = name === '..' && directory
        const nodeModules = name === 'node_modules' && directory
        const convertible =
          !parent && (await this.validateMarkdown(name, stat)).valid

        files.push({ convertible, directory, name, nodeModules, parent, stat })
      }

      callback(
        null,
        serverIndex({ directory, favicon, files, path, script, style })
      )
    })()
  }

  private async validateMarkdown(
    relativePath: string,
    fetchedStats?: fs.Stats
  ): Promise<Server.ValidateResult> {
    // Check extension
    const extension = path.extname(relativePath).slice(1)
    let valid = markdownExtensions.includes(extension)

    // Prevent directory traversal
    const baseDir = path.resolve(this.inputDir)
    const targetPath = path.join(baseDir, decodeURIComponent(relativePath))

    if (!targetPath.startsWith(baseDir)) {
      // Skip remaining process to prevent check for unexpected file and directory
      return { valid: false, path: targetPath }
    }

    // Check file stat
    let stats: fs.Stats | undefined
    try {
      stats = fetchedStats || (await stat(targetPath))
      valid = valid && !!(stats && stats.isFile())
    } catch (e) {
      valid = false
    }

    return { valid, stats, path: targetPath }
  }
}

export namespace Server {
  export declare interface Options {
    directoryIndex?: string[]
    onConverted?: ConvertedCallback
  }

  export declare interface ValidateResult {
    path: string
    stats?: fs.Stats
    valid: boolean
  }
}

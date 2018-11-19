import express, { Express } from 'express'
import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import serveIndex from 'serve-index'
import url from 'url'
import promisify from 'util.promisify'
import { Converter, ConvertedCallback, ConvertType } from './converter'
import { error } from './error'
import { File, markdownExtensions } from './file'
import serverIndex from './server/index.pug'
import style from './server/index.scss'

const stat = promisify(fs.stat)

export class Server {
  readonly converter: Converter
  readonly inputDir: string
  readonly options: Server.Options
  readonly port: Number

  server?: Express

  constructor(converter: Converter, opts: Server.Options = {}) {
    if (!converter.options.inputDir)
      error('Converter have to specify an input directory.')

    this.converter = converter
    this.inputDir = converter.options.inputDir!
    this.options = opts
    this.port = Number.parseInt(process.env.PORT!, 10) || 8080
  }

  async start() {
    this.setup()
    new Promise<void>(res => this.server!.listen(this.port, res))
  }

  private async validateMarkdown(relativePath: string, cachedStats?: fs.Stats) {
    // Check extension
    const extension = path.extname(relativePath).slice(1)
    if (!markdownExtensions.includes(extension)) return false

    // Prevent directory traversal
    const baseDir = path.resolve(this.inputDir)
    const targetPath = path.join(baseDir, decodeURIComponent(relativePath))
    if (!targetPath.startsWith(baseDir)) return false

    // Check file stat
    try {
      const fsStats: fs.Stats = cachedStats || (await stat(targetPath))
      return fsStats.isFile() ? targetPath : false
    } catch (e) {
      return false
    }
  }

  private async preprocess(req: express.Request, res: express.Response) {
    const { pathname, query } = url.parse(req.url)
    if (!pathname) return

    const validatedPath = await this.validateMarkdown(pathname)
    if (validatedPath) {
      const qs = querystring.parse(query || '')
      const pdf = Object.keys(qs).includes('pdf')
      const file = new File(validatedPath)

      this.converter.options.type = pdf ? ConvertType.pdf : ConvertType.html

      const converted = await this.converter.convertFile(file)
      res.end(converted.newFile.buffer)

      if (this.options.onConverted) this.options.onConverted(converted)
    }
  }

  private setup() {
    this.server = express()
    this.server.set('env', 'development')
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
      for (const f of fileList) {
        const { name, stat } = f
        const directory = stat && stat.isDirectory()
        const parent = name === '..' && directory
        const convertible =
          !parent && !!(await this.validateMarkdown(name, stat))

        files.push({ convertible, directory, name, parent, stat })
      }

      callback(null, serverIndex({ directory, files, path, style }))
    })()
  }
}

export namespace Server {
  export interface Options {
    onConverted?: ConvertedCallback
  }
}

import express, { Express } from 'express'
import fs from 'fs'
import path from 'path'
import serveIndex from 'serve-index'
import url from 'url'
import promisify from 'util.promisify'
import { Converter, ConvertedCallback } from './converter'
import { error } from './error'
import { File, markdownExtensions } from './file'

const extensions = [...markdownExtensions]
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

  private async preprocess(req: express.Request, res: express.Response) {
    // Check file path
    const pathname = url.parse(req.url).pathname || ''
    if (!extensions.includes(path.extname(pathname).slice(1))) return

    const baseDir = path.resolve(this.inputDir)
    const basePath = path.join(baseDir, decodeURIComponent(pathname))
    if (!basePath.startsWith(baseDir)) return

    let fn: string | undefined

    // Find markdown file
    for (const extension of markdownExtensions) {
      const targetPath = path.join(
        path.dirname(basePath),
        `${path.basename(basePath, path.extname(basePath))}.${extension}`
      )

      try {
        const ret: fs.Stats = await stat(targetPath)

        if (ret.isFile()) {
          fn = targetPath
          break
        }
      } catch (e) {}
    }

    if (fn) {
      const file = new File(fn)
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
      .use(serveIndex(this.inputDir, { icons: true }))
  }
}

export namespace Server {
  export interface Options {
    onConverted?: ConvertedCallback
  }
}

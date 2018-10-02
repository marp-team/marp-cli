import express, { Express } from 'express'
import fs from 'fs'
import path from 'path'
import url from 'url'
import { Converter, ConvertedCallback } from './converter'
import { error } from './error'
import { File, markdownExtensions } from './file'

export class Server {
  readonly converter: Converter
  readonly inputDir: string
  readonly options: Server.Options
  readonly port: Number

  server?: Express

  constructor(converter: Converter, opts: Server.Options = {}) {
    this.converter = converter
    this.options = opts
    this.port = Number.parseInt(process.env.PORT!, 10) || 8080

    if (!converter.options.inputDir)
      error('Converter have to specify an input directory.')

    this.inputDir = converter.options.inputDir!
  }

  async start() {
    this.setup()

    return new Promise<void>(res => this.server!.listen(this.port, res))
  }

  private async preprocess(req: express.Request, res: express.Response) {
    // Check file path
    const extensions = [...markdownExtensions, this.converter.options.type]
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
        const stat = await new Promise<fs.Stats>((resolve, reject) =>
          fs.lstat(targetPath, (e, stats) => (e ? reject(e) : resolve(stats)))
        )

        if (stat.isFile()) {
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
    if (this.server) return

    this.server = express()
    this.server.set('env', 'development')

    this.server
      .get('*', (req, res, next) =>
        this.preprocess(req, res).then(() => {
          if (!res.finished) next()
        })
      )
      .use(express.static(this.inputDir))
  }
}

export namespace Server {
  export interface Options {
    onConverted?: ConvertedCallback
  }
}

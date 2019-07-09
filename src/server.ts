import express, { Express } from 'express'
import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import serveIndex from 'serve-index'
import url from 'url'
import { promisify } from 'util'
import {
  Converter,
  ConvertedCallback,
  ConvertType,
  mimeTypes,
} from './converter'
import { error, CLIError } from './error'
import { File, markdownExtensions } from './file'
import TypedEventEmitter from './utils/typed-event-emitter'
import favicon from './assets/favicon.png'
import serverIndex from './server/index.pug'
import style from './server/index.scss'

const stat = promisify(fs.stat)
const readFile = promisify(fs.readFile)

export class Server extends TypedEventEmitter<Server.Events> {
  readonly converter: Converter
  readonly inputDir: string
  readonly options: Server.Options
  readonly port: Number

  directoryIndex: string[]
  server: Express | undefined

  private static script: string | undefined

  constructor(converter: Converter, opts: Server.Options = {}) {
    super()

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

    return new Promise<void>((resolve, reject) => {
      const httpServer = this.server!.listen(this.port)
      httpServer.on('listening', () => {
        resolve()
      })
      httpServer.on('error', err => {
        httpServer.close()

        if (err['code'] === 'EADDRINUSE') {
          reject(new CLIError(err.message))
        } else {
          reject(err)
        }
      })
    })
  }

  private async convertMarkdown(
    filename: string,
    query: querystring.ParsedUrlQuery = {}
  ) {
    this.converter.options.output = false
    this.converter.options.pages = false
    this.converter.options.type = ((): ConvertType => {
      const queryKeys = Object.keys(query)

      if (queryKeys.includes('pdf')) return ConvertType.pdf
      if (queryKeys.includes('pptx')) return ConvertType.pptx
      if (queryKeys.includes('png')) return ConvertType.png
      if (queryKeys.includes('jpg') || queryKeys.includes('jpeg'))
        return ConvertType.jpeg

      return ConvertType.html
    })()

    const ret = await this.converter.convertFile(new File(filename))
    this.emit('converted', ret)

    return ret
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
    const response = async fn => {
      try {
        const ret = await this.convertMarkdown(fn, qs)

        if (!ret.newFile)
          throw new Error('Converter must return a converted file to serve.')

        const { type } = this.converter.options

        // Download pptx document as an attachment
        if (type === ConvertType.pptx)
          res.attachment(`${path.basename(fn, path.extname(fn))}.pptx`)

        res.type(mimeTypes[type]).end(ret.newFile.buffer)
      } catch (e) {
        this.emit('error', e)
        res.status(503).end(e.toString())
      }
    }

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
  export interface Events {
    converted: ConvertedCallback
    error: (err: Error) => void
  }

  export interface Options {
    directoryIndex?: string[]
  }

  export interface ValidateResult {
    path: string
    stats?: fs.Stats
    valid: boolean
  }
}

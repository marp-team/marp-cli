import Marp from '@marp-team/marp-core'
import cheerio from 'cheerio'
import path from 'path'
import request from 'supertest'
import {
  Converter,
  ConvertType,
  ConverterOption,
  ConvertResult,
} from '../src/converter'
import { CLIError } from '../src/error'
import { Server } from '../src/server'
import { ThemeSet } from '../src/theme'

jest.mock('express')

afterEach(() => jest.restoreAllMocks())

describe('Server', () => {
  let themeSet: ThemeSet
  beforeEach(async () => (themeSet = await ThemeSet.initialize([])))

  const converter = (opts: Partial<ConverterOption> = {}) =>
    new Converter({
      themeSet,
      allowLocalFiles: false,
      engine: Marp,
      globalDirectives: {},
      inputDir: path.resolve(__dirname, '_files'),
      lang: 'en',
      options: {},
      server: true,
      template: 'bare',
      templateOption: {},
      type: ConvertType.html,
      watch: true,
      ...opts,
    })

  it('creates instance from converter', () => {
    const cvt = converter()
    const instance = new Server(cvt)

    expect(instance.converter).toBe(cvt)
    expect(instance.inputDir).toBe(cvt.options.inputDir)
    expect(instance.port).toBe(8080)
    expect(instance.server).toBeUndefined()
  })

  context('when passed converter has not specified inputDir option', () => {
    it('throws CLIError', () =>
      expect(() => new Server(converter({ inputDir: undefined }))).toThrowError(
        CLIError
      ))
  })

  context('when PORT environment variable is specified', () => {
    beforeEach(() => {
      process.env.PORT = '54321'
    })

    afterEach(() => {
      delete process.env.PORT
    })

    it('uses specified port number to serve', () =>
      expect(new Server(converter()).port).toBe(54321))
  })

  describe('#start', () => {
    it('triggers setup of express server and starts listening', async () => {
      const server = new Server(converter())
      await server.start()

      expect(server.server!.listen).toBeCalledWith(8080)
    })
  })

  describe('Routing', () => {
    const startServer = async (opts: Server.Options = {}) => {
      const server = new Server(converter(), opts)
      await server.start()

      return server
    }

    context('when there is request to a served markdown file', () => {
      it('triggers conversion and returns the content of converted HTML', async () => {
        const server = await startServer()
        const cvt = jest.spyOn(server.converter, 'convertFile')
        const response = await request(server.server).get('/1.md')

        expect(response.status).toBe(200)
        expect(cvt).toBeCalledTimes(1)

        const ret = await (cvt.mock.results[0].value as Promise<ConvertResult>)
        expect(response.text).toBe(ret.newFile!.buffer!.toString())
      })

      context('with listening `converted` event', () => {
        it('emits `converted` event after conversion', async () => {
          let ret: string | undefined

          const server = (await startServer()).on('converted', converted => {
            ret = converted.newFile!.buffer!.toString()
          })

          const response = await request(server.server).get('/1.md')
          expect(response.text).toBe(ret)
        })
      })

      context('with query parameter', () => {
        it('triggers conversion with corresponded type option', async () => {
          const server = await startServer()

          jest
            .spyOn<any, any>(server.converter, 'convertFile')
            .mockResolvedValue({ newFile: { buffer: 'converted' } })

          await request(server.server).get('/1.md')
          expect(server.converter.options.type).toBe(ConvertType.html)

          await request(server.server).get('/1.md?pdf')
          expect(server.converter.options.type).toBe(ConvertType.pdf)

          await request(server.server).get('/1.md?png')
          expect(server.converter.options.type).toBe(ConvertType.png)

          await request(server.server).get('/1.md?jpg')
          expect(server.converter.options.type).toBe(ConvertType.jpeg)

          await request(server.server).get('/1.md?jpeg')
          expect(server.converter.options.type).toBe(ConvertType.jpeg)
        })
      })

      context('when error raised while converting', () => {
        it('returns 503 with error response and emitting event', async () => {
          const err = new Error('test')
          const event = jest.fn()
          const { server, converter } = (await startServer()).on('error', event)

          jest.spyOn(converter, 'convertFile').mockRejectedValue(err)

          const response = await request(server).get('/1.md')
          expect(event).toBeCalledWith(err)
          expect(response.status).toBe(503)
          expect(response.text).toBe('Error: test')
        })
      })
    })

    context('when there is request to served directory', () => {
      it('shows the directory index with assigned class by kind', async () => {
        const server = await startServer()
        const response = await request(server.server).get('/')
        expect(response.status).toBe(200)

        const $ = cheerio.load(response.text)
        expect($('h1').text()).toBe('/')
        expect($('ul#index li')).toHaveLength(8) // Actual file count
        expect($('ul#index li.directory')).toHaveLength(4) // Directories
        expect($('ul#index li.directory.nodeModules')).toHaveLength(1)
        expect($('ul#index li.convertible')).toHaveLength(3) // Markdown files

        // PDF query parameter
        expect($('li a[href*="?pdf"]')).toHaveLength(3)
      })

      context('with specified directoryIndex costructor option', () => {
        it('serves the found convertible markdown', async () => {
          const server = await startServer({ directoryIndex: ['1.md'] })
          const response = await request(server.server).get('/')

          expect(response.status).toBe(200)

          const $ = cheerio.load(response.text)
          expect($('h1').text()).toBe('one')
        })
      })
    })

    context('when there is request to a static file', () => {
      it('returns the content of static file', async () => {
        const server = await startServer()
        const response = await request(server.server).get('/4.txt')

        expect(response.status).toBe(200)
        expect(response.text).toContain('four')
      })
    })

    context('when the requested file is not found', () => {
      it('returns 404', async () => {
        const server = await startServer()
        const response = await request(server.server).get('/__NOT_FOUND__')

        expect(response.status).toBe(404)
      })
    })

    context('when the directory traversal attack is detected', () => {
      it('returns 403', async () => {
        const server = await startServer()
        const response = await request(server.server).get('/../../README.md')

        expect(response.status).toBe(403)
      })
    })
  })
})

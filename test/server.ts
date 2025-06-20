import { ClientRequest } from 'node:http'
import path from 'node:path'
import { Marp } from '@marp-team/marp-core'
import { load } from 'cheerio'
import express, { application } from 'express'
import type { Express } from 'express'
import request from 'supertest'
import { WebSocket } from 'ws'
import { BrowserManager } from '../src/browser/manager'
import {
  Converter,
  ConvertType,
  ConverterOption,
  ConvertResult,
} from '../src/converter'
import { CLIError } from '../src/error'
import { Server } from '../src/server'
import { ThemeSet } from '../src/theme'
import { WatchNotifier } from '../src/watcher'

jest.mock('express')

describe('Server', () => {
  let browserManager: BrowserManager
  let themeSet: ThemeSet

  beforeAll(() => (browserManager = new BrowserManager()))
  beforeEach(async () => (themeSet = await ThemeSet.initialize([])))
  afterAll(async () => browserManager?.dispose())

  const converter = (opts: Partial<ConverterOption> = {}) =>
    new Converter({
      browserManager,
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

  describe('when passed converter has not specified inputDir option', () => {
    it('throws CLIError', () =>
      expect(() => new Server(converter({ inputDir: undefined }))).toThrow(
        CLIError
      ))
  })

  describe('when PORT environment variable is specified', () => {
    beforeEach(() => {
      process.env.PORT = '54321'
    })

    afterEach(() => {
      delete process.env.PORT
    })

    it('uses specified port number to serve', () =>
      expect(new Server(converter()).port).toBe(54321))
  })

  describe('when listener has emitted error', () => {
    const err = new Error('testError')

    beforeEach(() => {
      ;(express as any).__errorOnListening = err
    })

    afterEach(() => {
      ;(express as any).__errorOnListening = undefined
    })

    it('throws error', async () => {
      const server = new Server(converter())
      await expect(server.start()).rejects.toThrow(err)
    })

    describe('with EADDRINUSE code', () => {
      it('throws CLIError', async () => {
        ;(express as any).__errorOnListening = Object.assign(
          new Error('EADDRINUSE'),
          { code: 'EADDRINUSE' }
        )

        const server = new Server(converter())
        await expect(server.start()).rejects.toThrow(CLIError)
      })
    })
  })

  describe('#start', () => {
    it('triggers setup of express server and starts listening', async () => {
      const listen = jest.spyOn(application, 'listen')

      const server = new Server(converter())
      await server.start()

      expect(listen).toHaveBeenCalledWith(8080)
      expect(listen.mock.instances[0]).toBe(server.server)
    })
  })

  describe('Routing', () => {
    const setupServer = async (
      opts: Server.Options = {}
    ): Promise<Server & { server: Express }> => {
      const server: any = new Server(converter(), opts)

      await server.setup() // Setup server without listening
      return server
    }

    describe('when there is request to a served markdown file', () => {
      it('triggers conversion and returns the content of converted HTML', async () => {
        const server = await setupServer()
        const cvt = jest.spyOn(server.converter, 'convertFile')
        const response = await request(server.server).get('/1.md')

        expect(response.status).toBe(200)
        expect(cvt).toHaveBeenCalledTimes(1)

        const ret = await (cvt.mock.results[0].value as Promise<ConvertResult>)
        expect(response.text).toBe(ret.newFile?.buffer?.toString())
      })

      describe('with listening `converted` event', () => {
        it('emits `converted` event after conversion', async () => {
          let ret: string | undefined

          const server = (await setupServer()).on('converted', (converted) => {
            ret = converted.newFile?.buffer?.toString()
          })

          const response = await request(server.server).get('/1.md')
          expect(response.text).toBe(ret)
        })
      })

      describe('with query parameter', () => {
        it('triggers conversion with corresponded type option', async () => {
          const server = await setupServer()

          const convertFileSpy = jest
            .spyOn<any, any>(server.converter, 'convertFile')
            .mockResolvedValue({ newFile: { buffer: 'converted' } })

          try {
            const mdRes = await request(server.server).get('/1.md')
            expect(server.converter.options.type).toBe(ConvertType.html)
            expect(mdRes.type).toBe('text/html')

            const pdfRes = await request(server.server).get('/1.md?pdf')
            expect(server.converter.options.type).toBe(ConvertType.pdf)
            expect(pdfRes.type).toBe('application/pdf')

            const pptxRes = await request(server.server).get('/1.md?pptx')
            expect(server.converter.options.type).toBe(ConvertType.pptx)
            expect(pptxRes.type).toBe(
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            )

            // PPTX document is downloaded with a proper filename because it cannot show in browser window.
            expect(pptxRes.header['content-disposition']).toBe(
              'attachment; filename="1.pptx"'
            )

            const pngRes = await request(server.server).get('/1.md?png')
            expect(server.converter.options.type).toBe(ConvertType.png)
            expect(pngRes.type).toBe('image/png')

            const jpgRes = await request(server.server).get('/1.md?jpg')
            expect(server.converter.options.type).toBe(ConvertType.jpeg)
            expect(jpgRes.type).toBe('image/jpeg')

            const jpegRes = await request(server.server).get('/1.md?jpeg')
            expect(server.converter.options.type).toBe(ConvertType.jpeg)
            expect(jpegRes.type).toBe('image/jpeg')

            const txtRes = await request(server.server).get('/1.md?txt')
            expect(server.converter.options.type).toBe(ConvertType.notes)
            expect(txtRes.type).toBe('text/plain')

            const notesRes = await request(server.server).get('/1.md?notes')
            expect(server.converter.options.type).toBe(ConvertType.notes)
            expect(notesRes.type).toBe('text/plain')
          } finally {
            convertFileSpy.mockRestore()
          }
        })
      })

      describe('when error raised while converting', () => {
        it('returns 503 with error response and emitting event', async () => {
          const err = new Error('test')
          const event = jest.fn()
          const { server, converter } = (await setupServer()).on('error', event)

          const convertFileSpy = jest
            .spyOn(converter, 'convertFile')
            .mockRejectedValue(err)

          try {
            const response = await request(server).get('/1.md')
            expect(event).toHaveBeenCalledWith(err)
            expect(response.status).toBe(503)
            expect(response.text).toBe('Error: test')
          } finally {
            convertFileSpy.mockRestore()
          }
        })
      })
    })

    describe('when there is request to served directory', () => {
      it('shows the directory index with assigned class by kind', async () => {
        const server = await setupServer()
        const response = await request(server.server).get('/')
        expect(response.status).toBe(200)

        const $ = load(response.text)
        expect($('h1').text()).toBe('/')
        expect($('ul#index li')).toHaveLength(9) // Actual file count
        expect($('ul#index li.directory')).toHaveLength(5) // Directories
        expect($('ul#index li.directory.node-modules')).toHaveLength(1)
        expect($('ul#index li.convertible')).toHaveLength(3) // Markdown files

        // Link to query parameters
        expect($('li a[href*="?pdf"]')).toHaveLength(3)
        expect($('li a[href*="?pptx"]')).toHaveLength(3)
      })

      describe('with specified directoryIndex costructor option', () => {
        it('serves the found convertible markdown', async () => {
          const server = await setupServer({ directoryIndex: ['1.md'] })
          const response = await request(server.server).get('/')

          expect(response.status).toBe(200)

          const $ = load(response.text)
          expect($('h1').text()).toBe('one')
        })
      })
    })

    describe('when there is request to a static file', () => {
      it('returns the content of static file', async () => {
        const server = await setupServer()
        const response = await request(server.server).get('/4.txt')

        expect(response.status).toBe(200)
        expect(response.text).toContain('four')
      })
    })

    describe('when the requested file is not found', () => {
      it('returns 404', async () => {
        const server = await setupServer()
        const response = await request(server.server).get('/__NOT_FOUND__')

        expect(response.status).toBe(404)
      })
    })

    describe('when there is GET request to a proxy for watch notifier WebSocket', () => {
      it('returns 426', async () => {
        const server = await setupServer()
        const response = await request(server.server).get(
          '/.__marp-cli-watch-notifier__/xxxxxxxx'
        )

        expect(response.status).toBe(426)
        expect(response.text).toBe('Upgrade Required')
      })
    })

    describe('when connected WebSocket client to a proxy for watch notifier', () => {
      let server: Server
      let notifier: WatchNotifier
      let ws: WebSocket | undefined

      beforeEach(async () => {
        ;(express as any).__listenActually = true
        ws = undefined

        // Import fresh server and notifier
        await jest.isolateModulesAsync(async () => {
          server = new (await import('../src/server')).Server(converter())
          notifier = (await import('../src/watcher')).notifier
        })
      })

      afterEach(async () => {
        ws?.close()
        await Promise.all([server.stop(), notifier.stop()])
        ;(express as any).__errorOnListening = undefined
      })

      const connectWebSocket = async (url: string) => {
        const ws = new WebSocket(url)

        // Wait for establishing or failing WebSocket connection
        return new Promise<WebSocket>((resolve) => {
          ws.addEventListener('open', () => resolve(ws))
          ws.addEventListener('error', () => resolve(ws))
        })
      }

      it('does not open WebSocket connection if watch notifier is not ready', async () => {
        await server.start()

        ws = await connectWebSocket(
          `ws://localhost:${server.port}/.__marp-cli-watch-notifier__/${WatchNotifier.sha256('test.md')}`
        )

        expect([WebSocket.CLOSING, WebSocket.CLOSED]).toContain(ws.readyState)
      })

      it('opens WebSocket connection if watch notifier is ready', async () => {
        await notifier.start()
        await notifier.register('test.md')

        await server.start()

        ws = await connectWebSocket(
          `ws://localhost:${server.port}/.__marp-cli-watch-notifier__/${WatchNotifier.sha256('test.md')}`
        )

        expect(ws.readyState).toBe(WebSocket.OPEN)
      })

      it('does not open WebSocket connection if watch notifier is ready but the identifier is not registered', async () => {
        await notifier.start()
        await server.start()

        ws = await connectWebSocket(
          `ws://localhost:${server.port}/.__marp-cli-watch-notifier__/${WatchNotifier.sha256('test.md')}`
        )

        expect([WebSocket.CLOSING, WebSocket.CLOSED]).toContain(ws.readyState)
      })
    })

    describe('when the directory traversal attack is detected', () => {
      it('returns 404', async () => {
        const server = await setupServer()
        const response = await request(server.server).get('/../../README.md')

        // Current express is recognized directory traversal attack, and normalize request path to `/README.md`.
        // So prevention logic of Marp CLI (returns 403) is not passed now.
        // expect(response.status).toBe(403)
        expect(response.status).toBe(404)
      })

      it('normalizes the request path that is trying directory traversal attack', async () => {
        const server = await setupServer()
        const response = await request(server.server).get('/../../4.txt')

        expect((response.request.req as ClientRequest).path).toBe('/4.txt')
        expect(response.status).toBe(200)
      })
    })
  })
})

/** @jest-environment jsdom */
import portfinder from 'portfinder'
import { Server } from 'ws'
import watch from '../../src/templates/watch/watch'

beforeEach(() => {
  delete window.location
  ;(window as any).location = { reload: jest.fn() }
})

afterEach(() => jest.restoreAllMocks())

describe('Watch mode notifier on browser context', () => {
  let server: Server

  const createWSServer = async () => {
    const port = await portfinder.getPortPromise({ port: 37717 })

    return new Promise<Server>((res, rej) => {
      try {
        const createdServer = new Server({ port }, () => res(createdServer))
      } catch (e) {
        rej(e)
      }
    })
  }

  beforeEach(async () => {
    jest.spyOn(console, 'info').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    server = await createWSServer()
  })

  afterEach(() => server.close())

  context('when window.__marpCliWatchWS is defined', () => {
    beforeEach(() => {
      window['__marpCliWatchWS'] = `ws://localhost:${server.options.port}/test`
    })

    afterEach(() => delete window['__marpCliWatchWS'])

    it('connects to WebSocket server', (done) => {
      server.on('connection', (_, socket) => {
        expect(socket.url).toBe('/test')
        done()
      })

      watch()
    })

    it('listens reload event', async () => {
      const send = await new Promise<(data: any) => Promise<void>>(
        (res, rej) => {
          server.on('error', (e) => rej(e))
          server.on('connection', (ws) =>
            res(
              (data: any) =>
                new Promise<void>((resolve, reject) => {
                  ws.once('error', (e) => reject(e))
                  ws.send(data)

                  ws.once('pong', resolve)
                  ws.ping()
                })
            )
          )
          watch()
        }
      )

      await send('ready')
      expect(location.reload).not.toBeCalled()

      await send('reload')
      expect(location.reload).toBeCalled()
    })

    context('when closed WebSocket server', () => {
      beforeEach(() => jest.useFakeTimers())
      afterEach(() => jest.useRealTimers())

      it('reconnects watcher in 5 sec', async (done) => {
        const clientSocket = await new Promise<WebSocket>((res, rej) => {
          let socket: WebSocket

          server.once('error', (e) => rej(e))
          server.once('connection', () => res(socket))

          socket = watch()!
        })

        await new Promise((res) => {
          clientSocket.addEventListener('close', res)
          server.close()
        })

        server = await createWSServer()
        server.once('connection', (ws, socket) => {
          expect(socket.url).toBe('/test')

          ws.on('pong', () => {
            expect(location.reload).toBeCalled()
            done()
          })
          ws.ping()
        })

        jest.advanceTimersByTime(5000)
      })
    })
  })
})

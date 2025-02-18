/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
import { getPortPromise } from 'portfinder'
import { WebSocketServer } from 'ws'
import watch from '../../src/templates/watch/watch'

beforeEach(() => {
  delete (window as any).location
  ;(window as any).location = { reload: jest.fn() }
})

describe('Watch mode notifier on browser context', () => {
  let server: WebSocketServer
  let infoSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  const createWSServer = async () => {
    const port = await getPortPromise({ port: 37717 })

    return new Promise<WebSocketServer>((res, rej) => {
      try {
        const createdServer = new WebSocketServer({ port }, () =>
          res(createdServer)
        )
      } catch (e) {
        rej(e)
      }
    })
  }

  beforeEach(async () => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    server = await createWSServer()
  })

  afterEach(() => {
    server.close()

    infoSpy.mockRestore()
    warnSpy.mockRestore()
  })

  describe('when window.__marpCliWatchWS is defined', () => {
    beforeEach(() => {
      window['__marpCliWatchWS'] = `ws://localhost:${server.options.port}/test`
    })

    afterEach(() => delete window['__marpCliWatchWS'])

    it('connects to WebSocket server', () =>
      new Promise<void>((done) => {
        server.on('connection', (_, socket) => {
          expect(socket.url).toBe('/test')
          done()
        })

        watch()
      }))

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
      expect(location.reload).not.toHaveBeenCalled()

      await send('reload')
      expect(location.reload).toHaveBeenCalled()
    })

    describe('when closed WebSocket server', () => {
      beforeEach(() => jest.useFakeTimers())
      afterEach(() => jest.useRealTimers())

      it('reconnects watcher in 5 sec', () =>
        new Promise<void>((done) =>
          (async () => {
            const clientSocket = await new Promise<WebSocket>((res, rej) => {
              server.once('error', (e) => rej(e))
              server.once('connection', () => res(socket))

              const socket = watch()!
            })

            await new Promise((res) => {
              clientSocket.addEventListener('close', res)
              server.close()

              // ws v8 requires closing the connections manually.
              for (const ws of server.clients) ws.terminate()
            })

            server = await createWSServer()
            server.once('connection', (ws, socket) => {
              expect(socket.url).toBe('/test')

              ws.on('pong', () => {
                expect(location.reload).toHaveBeenCalled()
                done()
              })
              ws.ping()
            })

            jest.advanceTimersByTime(5000)
          })()
        ))
    })
  })
})

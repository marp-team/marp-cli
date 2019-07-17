/** @jest-environment jsdom */
import portfinder from 'portfinder'
import { Server } from 'ws'
import watch from '../../src/templates/watch/watch'

afterEach(() => jest.restoreAllMocks())

describe('Watch mode notifier on browser context', () => {
  let server: Server

  beforeEach(async done => {
    jest.spyOn(console, 'info').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    const port = await portfinder.getPortPromise({ port: 52000 })
    server = new Server({ port }, done)
  })

  afterEach(() => server.close())

  context('when window.__marpCliWatchWS is defined', () => {
    beforeEach(() => {
      window['__marpCliWatchWS'] = `ws://localhost:${server.options.port}/test`
    })

    afterEach(() => delete window['__marpCliWatchWS'])

    it('connects to WebSocket server', done => {
      server.on('connection', (_, socket) => {
        expect(socket.url).toBe('/test')
        done()
      })

      watch()
    })

    it('listens reload event', async () => {
      const reload = jest.spyOn(location, 'reload').mockImplementation()

      const send = await new Promise<(data: any) => Promise<void>>(
        (res, rej) => {
          server.on('error', e => rej(e))
          server.on('connection', ws =>
            res(
              (data: any) =>
                new Promise<void>((resolve, reject) => {
                  ws.once('error', e => reject(e))
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
      expect(reload).not.toHaveBeenCalled()

      await send('reload')
      expect(reload).toHaveBeenCalled()
    })
  })
})

import chokidar from 'chokidar'
import http from 'http'
import portfinder from 'portfinder'
import * as cli from '../src/cli'
import { File, FileType } from '../src/file'
import { Watcher, WatchNotifier, notifier } from '../src/watcher'

const mockWsOn = jest.fn()

jest
  .mock('chokidar', () => ({
    watch: jest.fn(() => ({
      on: jest.fn(function() {
        return this
      }),
    })),
  }))
  .mock('ws', () => ({
    Server: jest.fn(() => ({
      close: jest.fn(),
      on: mockWsOn,
    })),
  }))
  .mock('../src/watcher')

afterEach(() => {
  jest.restoreAllMocks()
  mockWsOn.mockReset()
})

describe('Watcher', () => {
  describe('.watch', () => {
    const { watch } = Watcher
    const convertFiles = jest.fn()
    const converterStub = { convertFiles: convertFiles.mockResolvedValue(0) }

    beforeEach(() => jest.spyOn(cli, 'info').mockImplementation())

    it('starts chokidar watcher and WebSocket notifier', async () => {
      const events = { onConverted: jest.fn(), onError: jest.fn() }
      const file = new File('test.md')
      const watcher = watch('test.md', <any>{
        events,
        converter: converterStub,
        finder: async () => [file],
      })

      expect(watcher).toBeInstanceOf(Watcher)
      expect(chokidar.watch).toHaveBeenCalledWith('test.md', expect.anything())
      expect(notifier.start).toHaveBeenCalled()

      const { on } = watcher.chokidar
      expect(on).toHaveBeenCalledWith('change', expect.any(Function))
      expect(on).toHaveBeenCalledWith('add', expect.any(Function))

      // Trigger converter and notifier if filepath is matched to finder files
      for (const [, convertFunc] of (<jest.Mock>on).mock.calls) {
        convertFiles.mockClear()
        await convertFunc('test.md')
        expect(convertFiles).toHaveBeenCalledTimes(1)

        const [files, onConverted] = convertFiles.mock.calls[0]
        expect(files).toContain(file)

        // Trigger events
        events.onConverted.mockClear()
        ;(<jest.Mock>notifier.sendTo).mockClear()

        onConverted({ file: { absolutePath: 'path', type: FileType.File } })
        expect(events.onConverted).toHaveBeenCalled()
        expect(notifier.sendTo).toHaveBeenCalledWith('path', 'reload')

        // Error handling
        events.onError.mockClear()
        convertFiles.mockImplementationOnce(() => {
          throw new Error('Error occurred')
        })

        await convertFunc('test.md')
        expect(events.onError).toHaveBeenCalledTimes(1)
      }
    })
  })
})

describe('WatchNotifier', () => {
  const testIdentifier = WatchNotifier.sha256('test')

  it('has a singleton notifier', () =>
    expect(notifier).toBeInstanceOf(WatchNotifier))

  describe('#port', () => {
    it('finds available port from 52000', async () => {
      const finderSpy = jest.spyOn(portfinder, 'getPortPromise')
      const instance = new WatchNotifier()

      expect(await instance.port()).toBe(52000)
      expect(finderSpy).toHaveBeenCalledTimes(1)

      // Return stored port number of instance when called twice
      await instance.port()
      expect(finderSpy).toHaveBeenCalledTimes(1)
    })

    context('when 52000 port is using for the other purpose', () => {
      let server: http.Server

      beforeEach(() =>
        (server = http.createServer((_, res) => res.end()).listen(52000)))
      afterEach(() => server.close())

      it('returns port number 52001', async () =>
        expect(await new WatchNotifier().port()).toBe(52001))
    })
  })

  describe('#register', () => {
    it('generates WebSocket URL from path string and add to listeners', async () => {
      const instance = new WatchNotifier()
      expect(await instance.register('test')).toBe(
        `ws://localhost:52000/${testIdentifier}`
      )

      const listenerSet = instance.listeners.get(testIdentifier)
      expect(listenerSet).toBeInstanceOf(Set)
      expect(listenerSet.size).toBe(0)

      // Keep the content of set even if called twice
      listenerSet.add('test')
      await instance.register('test')
      expect(listenerSet.size).toBe(1)
    })
  })

  describe('#sendTo', () => {
    let instance: WatchNotifier
    const socketA = { send: jest.fn() }
    const socketB = { send: jest.fn() }

    beforeEach(async () => {
      instance = new WatchNotifier()
      instance.listeners.set(testIdentifier, new Set([socketA, socketB]))
      await instance.start()

      socketA.send.mockClear()
      socketB.send.mockClear()
    })

    afterEach(() => instance.stop())

    it('sends command to listening sockets and returns true', () => {
      expect(instance.sendTo('test', 'command')).toBe(true)
      expect(socketA.send).toHaveBeenCalledWith('command')
      expect(socketB.send).toHaveBeenCalledWith('command')
    })

    it('returns false when WebSocket server is stopped', () => {
      instance.stop()
      expect(instance.sendTo('test', 'command')).toBe(false)
      expect(socketA.send).not.toHaveBeenCalled()
      expect(socketB.send).not.toHaveBeenCalled()
    })

    it('returns false when passed path is not registered', () =>
      expect(instance.sendTo('not-registered', 'command')).toBe(false))
  })

  describe('#start', () => {
    let ws
    let instance: WatchNotifier

    beforeEach(() => {
      instance = new WatchNotifier()
      ws = { close: jest.fn(), on: jest.fn(), send: jest.fn() }
    })

    afterEach(() => instance.stop())

    const wss = () => (<any>instance).wss

    it('starts WebSocket server for notify to HTML', async () => {
      expect(wss()).toBeUndefined()

      await instance.start()
      expect(wss()).not.toBeUndefined()
    })

    context('when client is connected to registered path', () => {
      beforeEach(() => instance.register('test'))

      it('adds socket to registered set and sends "ready" command', async () => {
        await instance.start()

        expect(mockWsOn).toBeCalledTimes(1)
        expect(mockWsOn).toBeCalledWith('connection', expect.any(Function))
        expect(instance.listeners.get(testIdentifier).size).toBe(0)

        const [, connection] = mockWsOn.mock.calls[0]
        connection(ws, { url: `/${testIdentifier}` })
        expect(ws.send).toHaveBeenCalledWith('ready')
        expect(instance.listeners.get(testIdentifier).has(ws)).toBe(true)

        // Remove listener by closing connection
        expect(ws.on).toHaveBeenCalledTimes(1)
        expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function))

        const [, onclose] = ws.on.mock.calls[0]
        onclose()
        expect(instance.listeners.get(testIdentifier).has(ws)).toBe(false)
      })

      it('closes client socket immediately when passed invalid URL', async () => {
        await instance.start()

        const [, connection] = mockWsOn.mock.calls[0]
        connection(ws, { url: '/invalid' })

        expect(ws.send).not.toHaveBeenCalled()
        expect(ws.close).toHaveBeenCalled()
      })
    })
  })

  describe('.sha256', () => {
    it('returns sha256 hex string', () =>
      expect(WatchNotifier.sha256('a')).toBe(
        'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb'
      ))
  })
})

import http from 'node:http'
import { watch as chokidarWatch } from 'chokidar'
import { File, FileType } from '../src/file'
import { ThemeSet } from '../src/theme'
import { Watcher, WatchNotifier, notifier } from '../src/watcher'

const portfinder = require('portfinder') // eslint-disable-line @typescript-eslint/no-require-imports
const mockWsOn = jest.fn()

jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(function (this: any) {
      return this
    }),
  })),
}))

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => ({
    clients: [],
    close: jest.fn((callback) => callback()),
    on: mockWsOn,
  })),
}))

jest.mock('../src/watcher')
jest.mock('../src/theme')

afterEach(() => {
  mockWsOn.mockReset()
})

describe('Watcher', () => {
  const file = new File('test.md')

  const createThemeSet = () => {
    const instance = new (ThemeSet as any)()

    instance.findPath.mockResolvedValue(['test.css'])
    instance.themes = { delete: jest.fn() }

    return instance
  }

  const createWatcher = (opts: Partial<Watcher.Options> = {}) =>
    Watcher.watch(['test.md'], {
      finder: async () => [file],
      converter: {
        convertFiles: jest.fn(),
        options: { themeSet: createThemeSet() },
      } as any,
      events: {
        onConverted: jest.fn(),
        onError: jest.fn(),
      },
      mode: Watcher.WatchMode.Convert,
      ...opts,
    })

  describe('.watch', () => {
    it('starts chokidar watcher and WebSocket notifier', async () => {
      const watcher = createWatcher()

      expect(watcher).toBeInstanceOf(Watcher)
      expect(chokidarWatch).toHaveBeenCalledWith(['test.md'], expect.anything())
      expect(notifier.start).toHaveBeenCalled()

      // Chokidar events
      const on = watcher.chokidar.on as jest.Mock

      expect(on).toHaveBeenCalledWith('all', expect.any(Function))
      expect(on).toHaveBeenCalledWith('change', expect.any(Function))
      expect(on).toHaveBeenCalledWith('add', expect.any(Function))
      expect(on).toHaveBeenCalledWith('unlink', expect.any(Function))

      const onAll = on.mock.calls.find(([e]) => e === 'all')[1]
      const onChange = on.mock.calls.find(([e]) => e === 'change')[1]
      const onAdd = on.mock.calls.find(([e]) => e === 'add')[1]
      const onUnlink = on.mock.calls.find(([e]) => e === 'unlink')[1]

      // Callbacks
      const log = jest.spyOn(watcher as any, 'log')
      const conv = jest.spyOn(watcher as any, 'convert').mockImplementation()
      const del = jest.spyOn(watcher as any, 'delete').mockImplementation()

      try {
        onAll('event', 'path')
        expect(log).toHaveBeenCalledWith('event', 'path')

        onChange('change')
        expect(conv).toHaveBeenCalledWith('change')

        onAdd('add')
        expect(conv).toHaveBeenCalledWith('add')

        onUnlink('unlink')
        expect(del).toHaveBeenCalledWith('unlink')

        watcher.converter.options.themeSet.onThemeUpdated('theme-update')
        expect(conv).toHaveBeenCalledWith('theme-update')
      } finally {
        conv.mockRestore()
        del.mockRestore()
      }
    })
  })

  describe('#convert', () => {
    describe('when passed filename is found from file finder', () => {
      it('converts markdown', async () => {
        const watcher: any = createWatcher()

        await watcher.convert('test.md')
        expect(watcher.converter.convertFiles).toHaveBeenCalledTimes(1)

        const [files, { onConverted }] =
          watcher.converter.convertFiles.mock.calls[0]
        expect(files).toContain(file)

        // Trigger events
        onConverted({ file: { absolutePath: 'test.md', type: FileType.File } })
        expect(watcher.events.onConverted).toHaveBeenCalled()
        expect(notifier.sendTo).toHaveBeenCalledWith('test.md', 'reload')

        // Error handling
        watcher.converter.convertFiles.mockImplementationOnce(() => {
          throw new Error('Error occurred')
        })

        await watcher.convert('test.md')
        expect(watcher.events.onError).toHaveBeenCalledTimes(1)
      })

      describe('with notify mode', () => {
        it('does not convert markdown but triggers notifier', async () => {
          const watcher: any = createWatcher({ mode: Watcher.WatchMode.Notify })

          await watcher.convert('test.md')
          expect(watcher.converter.convertFiles).toHaveBeenCalledTimes(0)
          expect(notifier.sendTo).toHaveBeenCalledWith('test.md', 'reload')
        })
      })
    })

    describe('when passed filename is found from theme finder', () => {
      it('reloads theme CSS', async () => {
        const watcher: any = createWatcher()
        const { load } = watcher.converter.options.themeSet

        await watcher.convert('test.css')
        expect(load).toHaveBeenCalledWith(expect.stringContaining('test.css'))
      })
    })
  })

  describe('#delete', () => {
    it('removes file from observer and theme collection', () => {
      const watcher: any = createWatcher()
      const { themeSet } = watcher.converter.options
      const fn = expect.stringContaining('test.md')

      watcher.delete('test.md')
      expect(themeSet.unobserve).toHaveBeenCalledWith(fn)
      expect(themeSet.themes.delete).toHaveBeenCalledWith(fn)
    })
  })
})

describe('WatchNotifier', () => {
  const testIdentifier = WatchNotifier.sha256('test')

  it('has a singleton notifier', () =>
    expect(notifier).toBeInstanceOf(WatchNotifier))

  describe('#port', () => {
    it('finds available port from 37717', async () => {
      const finderSpy = jest.spyOn(portfinder, 'getPortPromise')

      try {
        const instance = new WatchNotifier()

        expect(await instance.port()).toBe(37717)
        expect(finderSpy).toHaveBeenCalledTimes(1)

        // Return stored port number of instance when called twice
        await instance.port()
        expect(finderSpy).toHaveBeenCalledTimes(1)
      } finally {
        finderSpy.mockRestore()
      }
    })

    describe('when 37717 port is using for the other purpose', () => {
      let server: http.Server

      beforeEach(
        () => (server = http.createServer((_, res) => res.end()).listen(37717))
      )
      afterEach(() => server.close())

      it('returns port number 37718', async () =>
        expect(await new WatchNotifier().port()).toBe(37718))
    })
  })

  describe('#register', () => {
    it('generates WebSocket URL from path string and add to listeners', async () => {
      const instance = new WatchNotifier()
      expect(await instance.register('test')).toBe(
        `ws://localhost:37717/${testIdentifier}`
      )

      const listenerSet = instance.listeners.get(testIdentifier)
      expect(listenerSet).toBeInstanceOf(Set)
      expect(listenerSet?.size).toBe(0)

      // Keep the content of set even if called twice
      listenerSet?.add('test')
      await instance?.register('test')
      expect(listenerSet?.size).toBe(1)
    })

    it('generates WebSocket URL with relative path for server entrypoint if specified entrypoint type as "server"', async () => {
      const instance = new WatchNotifier()
      expect(await instance.register('test', 'server')).toBe(
        `/${WatchNotifier.webSocketEntrypoint}/${testIdentifier}`
      )
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

    it('returns false when WebSocket server is stopped', async () => {
      await instance.stop()
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

    const wss = () => (instance as any).wss

    it('starts WebSocket server for notify to HTML', async () => {
      expect(wss()).toBeUndefined()

      await instance.start()
      expect(wss()).toBeDefined()
    })

    describe('when client is connected to registered path', () => {
      beforeEach(() => instance.register('test'))

      it('adds socket to registered set and sends "ready" command', async () => {
        await instance.start()

        expect(mockWsOn).toHaveBeenCalledTimes(1)
        expect(mockWsOn).toHaveBeenCalledWith(
          'connection',
          expect.any(Function)
        )
        expect(instance.listeners.get(testIdentifier)?.size).toBe(0)

        const [, connection] = mockWsOn.mock.calls[0]
        connection(ws, { url: `/${testIdentifier}` })
        expect(ws.send).toHaveBeenCalledWith('ready')
        expect(instance.listeners.get(testIdentifier)?.has(ws)).toBe(true)

        // Remove listener by closing connection
        expect(ws.on).toHaveBeenCalledTimes(1)
        expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function))

        const [, onclose] = ws.on.mock.calls[0]
        onclose()
        expect(instance.listeners.get(testIdentifier)?.has(ws)).toBe(false)
      })

      it('closes client socket immediately when passed URL that is invalid as watch notifier', async () => {
        await instance.start()

        const [, connection] = mockWsOn.mock.calls[0]
        connection(ws, { url: '/invalid' })

        expect(ws.send).not.toHaveBeenCalled()
        expect(ws.close).toHaveBeenCalled()
      })

      it('closes client socket immediately when passed invalid URL', async () => {
        await instance.start()

        const [, connection] = mockWsOn.mock.calls[0]
        connection(ws, { url: '//' })

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

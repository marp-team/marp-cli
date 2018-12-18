import { enterTestMode } from 'carlo'
import path from 'path'
import { File, FileType } from '../src/file'
import { Preview, fileToURI } from '../src/preview'
import { CLIError } from '../src/error'

jest.mock('path')

beforeAll(() => enterTestMode())

describe('Preview', () => {
  const previews = new Set<Preview>()
  const preview = (opts = {}) => {
    const instance = new Preview(opts)
    previews.add(instance)

    return instance
  }

  afterEach(async () => {
    for (const instance of previews) {
      if (instance.carlo) {
        const browser = instance.carlo.browserForTest()
        await browser.close()

        const proc = await browser.process()
        if (!proc.killed) proc.kill()
      }
    }
    previews.clear()
  })

  describe('#open', () => {
    it('opens specified URL in new window', async () => {
      const instance = preview()
      await instance.open('about:blank')

      const windows = instance.carlo.windows()
      expect(windows).toHaveLength(1)
      expect(windows[0].pageForTest().url()).toBe('about:blank')
    })

    it('emits launch event', async () => {
      const instance = preview()
      const launchEvent = jest.fn()
      instance.on('launch', launchEvent)

      await instance.open('about:blank')
      expect(launchEvent).toBeCalledTimes(1)
    })

    it('emits opening event with location', async () => {
      const instance = preview()
      const openingEvent = jest.fn()
      instance.on('opening', openingEvent)

      await instance.open('about:blank')
      expect(openingEvent).toBeCalledTimes(1)
      expect(openingEvent).toBeCalledWith('about:blank')
    })

    it('emits open event with window instance and location', async () => {
      const instance = preview()
      const openEvent = jest.fn()
      instance.on('open', openEvent)

      await instance.open('about:blank')
      expect(openEvent).toBeCalledTimes(1)

      const [win, location] = openEvent.mock.calls[0]
      expect(location).toBe('about:blank')
      expect(win.pageForTest().url()).toBe('about:blank')
    })

    context('with constructor option about window size', () => {
      it('opens window that have specified window size', async () => {
        const instance = preview({ height: 400, width: 200 })
        await instance.open('about:blank')

        const [win] = instance.carlo.windows()
        expect(await win.bounds()).toMatchObject({ height: 400, width: 200 })
      })
    })

    context('when calling twice', () => {
      it('opens 2 windows', async () => {
        const instance = preview()
        await instance.open('about:blank')
        await instance.open('about:blank')

        expect(instance.carlo.windows()).toHaveLength(2)
      })

      it('emits launch event once and opening / open event twice', async () => {
        const launchEvent = jest.fn()
        const openingEvent = jest.fn()
        const openEvent = jest.fn()
        const instance = preview()

        instance.on('launch', launchEvent)
        instance.on('opening', openingEvent)
        instance.on('open', openEvent)

        await instance.open('about:blank')
        await instance.open('about:blank')

        expect(launchEvent).toBeCalledTimes(1)
        expect(openingEvent).toBeCalledTimes(2)
        expect(openEvent).toBeCalledTimes(2)
      })
    })
  })
})

describe('#fileToURI', () => {
  context('with passing file', () => {
    const { posix, win32 } = <any>path

    context('in posix file system', () =>
      it('returns file schema URI', () => {
        posix()
        expect(fileToURI(new File('/a/b/c'))).toBe('file:///a/b/c')
      })
    )

    context('in Windows file system', () =>
      it('returns file schema URI', () => {
        win32()
        expect(fileToURI(new File('c:\\abc'))).toBe('file:///c:/abc')
      })
    )
  })

  context('with passing standard IO buffer', () => {
    const file = () => {
      const fileInstance = new File('')

      fileInstance.type = FileType.StandardIO
      return fileInstance
    }

    it('returns data schema URI with encoded buffer by Base64', () => {
      const instance = file()
      instance.buffer = Buffer.from('buffer')

      expect(fileToURI(instance)).toBe('data:text/html;base64,YnVmZmVy')
    })

    context('when buffer is not ready', () =>
      it('throws CLIError', () =>
        expect(() => fileToURI(file())).toThrow(CLIError))
    )
  })
})

import path from 'path'
import terminate from 'terminate'
import { ConvertType } from '../src/converter'
import { File, FileType } from '../src/file'
import { Preview, fileToURI } from '../src/preview'
import { CLIError } from '../src/error'

jest.mock('path')

describe('Preview', () => {
  const previews = new Set<Preview>()
  const preview = (...args) => {
    const instance = new Preview(...args)
    previews.add(instance)

    return instance
  }

  afterEach(async () => {
    for (const instance of previews) {
      if (instance.carlo) {
        const browser = instance.carlo.browserForTest()
        const { pid } = browser.process()

        await browser.disconnect()
        await new Promise(resolve => terminate(pid, resolve))
      }
    }
    previews.clear()
  })

  describe('#open', () => {
    it('opens specified URL in new window', async () => {
      const instance = preview()
      const win = await instance.open('about:blank')

      expect(instance.carlo.windows()).toHaveLength(1)
      expect(win.pageForTest().url()).toBe('about:blank')
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
        const win = await instance.open('about:blank')
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

      context('when opened window is closed', () => {
        it('emits close event with closed window', async () => {
          const instance = preview()
          const closeEvent = jest.fn()
          instance.on('close', closeEvent)

          const win = await instance.open('about:blank')
          const win2 = await instance.open('about:blank')

          // Closing 2 windows will get test stability in Windows for some reason
          await win.close()
          await win2.close()

          expect(closeEvent).toBeCalledTimes(2)
          expect(closeEvent).toBeCalledWith(win)
          expect(closeEvent).toBeCalledWith(win2)
        })
      })
    })
  })
})

describe('#fileToURI', () => {
  context('with passing file', () => {
    const { posix, win32 } = <any>path

    context('in posix file system', () => {
      it('returns file schema URI', () => {
        posix()
        expect(fileToURI(new File('/a/b/c'), ConvertType.html)).toBe(
          'file:///a/b/c'
        )
      })
    })

    context('in Windows file system', () => {
      it('returns file schema URI', () => {
        win32()
        expect(fileToURI(new File('c:\\abc'), ConvertType.html)).toBe(
          'file:///c:/abc'
        )
      })
    })
  })

  context('with passing standard IO buffer', () => {
    const file = () => {
      const fileInstance = new File('')

      fileInstance.type = FileType.StandardIO
      return fileInstance
    }

    it('returns data schema URI with MIME type and encoded buffer by Base64', () => {
      const instance = file()
      instance.buffer = Buffer.from('buffer')

      expect(fileToURI(instance, ConvertType.html)).toBe(
        'data:text/html;base64,YnVmZmVy'
      )
      expect(fileToURI(instance, ConvertType.pdf)).toBe(
        'data:application/pdf;base64,YnVmZmVy'
      )
      expect(fileToURI(instance, ConvertType.png)).toBe(
        'data:image/png;base64,YnVmZmVy'
      )
      expect(fileToURI(instance, ConvertType.jpeg)).toBe(
        'data:image/jpeg;base64,YnVmZmVy'
      )
    })

    context('when buffer is not ready', () => {
      it('throws CLIError', () =>
        expect(() => fileToURI(file(), ConvertType.html)).toThrow(CLIError))
    })
  })
})

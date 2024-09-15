import path from 'node:path'
import { ConvertType } from '../src/converter'
import { CLIError } from '../src/error'
import { File, FileType } from '../src/file'
import { Preview, fileToURI } from '../src/preview'

jest.mock('node:path')
jest.setTimeout(40000)

describe('Preview', () => {
  const previews = new Set<Preview>()
  const preview = (...args): Preview => {
    const instance = new Preview(...args)
    previews.add(instance)

    return instance
  }

  afterEach(async () => {
    await Promise.all([...previews.values()].map((p) => p.exit()))
    previews.clear()
  })

  describe('#open', () => {
    it('opens specified URL in new window', async () => {
      const instance = preview()
      const win = await instance.open('about:blank')

      expect(await instance.puppeteer?.pages()).toHaveLength(1)
      expect(win.page.url()).toBe('about:blank')
    })

    it('emits launch event', async () => {
      const instance = preview()
      const launchEvent = jest.fn()
      instance.on('launch', launchEvent)

      await instance.open('about:blank')
      expect(launchEvent).toHaveBeenCalledTimes(1)
    })

    it('emits opening event with location', async () => {
      const instance = preview()
      const openingEvent = jest.fn()
      instance.on('opening', openingEvent)

      await instance.open('about:blank')
      expect(openingEvent).toHaveBeenCalledTimes(1)
      expect(openingEvent).toHaveBeenCalledWith('about:blank')
    })

    it('emits open event with window instance and location', async () => {
      const instance = preview()
      const openEvent = jest.fn()
      instance.on('open', openEvent)

      await instance.open('about:blank')
      expect(openEvent).toHaveBeenCalledTimes(1)

      const [win, location] = openEvent.mock.calls[0]
      expect(location).toBe('about:blank')
      expect(win.page.url()).toBe('about:blank')
    })

    describe('with constructor option about window size', () => {
      it('opens window that have specified (or smaller) window size', async () => {
        const instance = preview({ height: 600, width: 400 })
        const win = await instance.open('about:blank')

        const { height, width } = await win.page.evaluate(() => ({
          height: window.innerHeight,
          width: window.innerWidth,
        }))

        expect(height).toBeLessThanOrEqual(600)
        expect(width).toBeLessThanOrEqual(400)
      })
    })

    describe('when calling twice', () => {
      it('opens 2 windows', async () => {
        const instance = preview()
        await instance.open('about:blank')
        await instance.open('about:blank')

        expect(await instance.puppeteer?.pages()).toHaveLength(2)
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

        expect(launchEvent).toHaveBeenCalledTimes(1)
        expect(openingEvent).toHaveBeenCalledTimes(2)
        expect(openEvent).toHaveBeenCalledTimes(2)
      })

      describe('when opened window is closed', () => {
        it('emits close event with closed window', () =>
          new Promise<void>((done) =>
            (async () => {
              const instance = preview()
              const closeEvent = jest.fn()

              instance.on('close', closeEvent)
              instance.on('exit', () => {
                expect(closeEvent).toHaveBeenCalledTimes(2)
                expect(closeEvent).toHaveBeenCalledWith(win)
                expect(closeEvent).toHaveBeenCalledWith(win2)
                done()
              })

              const win = await instance.open('about:blank')
              const win2 = await instance.open('about:blank')

              await win.close()
              await win2.close()
            })()
          ))
      })
    })
  })
})

describe('#fileToURI', () => {
  describe('with passing file', () => {
    const { posix, win32 } = path as any

    describe('in posix file system', () => {
      it('returns file schema URI', () => {
        posix()
        expect(fileToURI(new File('/a/b/c'), ConvertType.html)).toBe(
          'file:///a/b/c'
        )
      })
    })

    describe('in Windows file system', () => {
      it('returns file schema URI', () => {
        win32()
        expect(fileToURI(new File('c:\\abc'), ConvertType.html)).toBe(
          'file:///c:/abc'
        )
      })
    })
  })

  describe('with passing standard IO buffer', () => {
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

    describe('when buffer is not ready', () => {
      it('throws CLIError', () =>
        expect(() => fileToURI(file(), ConvertType.html)).toThrow(CLIError))
    })
  })
})

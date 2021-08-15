/** @jest-environment jsdom */
import { fullscreen } from '../../../src/templates/bespoke/utils'

afterEach(() => jest.restoreAllMocks())

describe('Fullscreen utility', () => {
  const docInitial: Record<string, any> = {}
  const bodyInitial: Record<string, any> = {}

  beforeAll(() => {
    docInitial.fullscreenEnabled = document.fullscreenEnabled
    docInitial.webkitFullscreenEnabled = (
      document as any
    ).webkitFullscreenEnabled
    docInitial.fullscreenElement = document.fullscreenElement
    docInitial.webkitFullscreenElement = (
      document as any
    ).webkitFullscreenElement
    docInitial.exitFullscreen = document.exitFullscreen
    docInitial.webkitExitFullscreen = (document as any).webkitExitFullscreen

    bodyInitial.requestFullscreen = document.body.requestFullscreen
    bodyInitial.webkitRequestFullscreen = (
      document.body as any
    ).webkitRequestFullscreen
  })

  afterEach(() => {
    Object.assign(document, docInitial)
    Object.assign(document.body, bodyInitial)
  })

  describe('#isEnabled', () => {
    it('returns the same value as document.fullscreenEnabled', () => {
      Object.assign(document, { fullscreenEnabled: true })
      expect(fullscreen.isEnabled()).toBe(true)

      Object.assign(document, { fullscreenEnabled: false })
      expect(fullscreen.isEnabled()).toBe(false)

      Object.assign(document, { fullscreenEnabled: undefined })
      expect(fullscreen.isEnabled()).toBe(false)
    })

    it('fallbacks into document.webkitFullscreenEnabled', () => {
      Object.assign(document, { fullscreenEnabled: undefined })

      Object.assign(document, { webkitFullscreenEnabled: true })
      expect(fullscreen.isEnabled()).toBe(true)

      Object.assign(document, { webkitFullscreenEnabled: false })
      expect(fullscreen.isEnabled()).toBe(false)

      Object.assign(document, { webkitFullscreenEnabled: undefined })
      expect(fullscreen.isEnabled()).toBe(false)
    })
  })

  describe('#isFullscreen', () => {
    it('returns a boolean value whether document.fullscreenElement is truthy', () => {
      Object.assign(document, { fullscreenElement: undefined })
      expect(fullscreen.isFullscreen()).toBe(false)

      Object.assign(document, { fullscreenElement: document.body })
      expect(fullscreen.isFullscreen()).toBe(true)
    })

    it('fallbacks into document.webkitFullscreenEnabled', () => {
      Object.assign(document, { fullscreenElement: undefined })

      Object.assign(document, { webkitFullscreenElement: undefined })
      expect(fullscreen.isFullscreen()).toBe(false)

      Object.assign(document, { webkitFullscreenElement: document.body })
      expect(fullscreen.isFullscreen()).toBe(true)
    })
  })

  describe('#enter', () => {
    it('calls document.body.requestFullscreen', async () => {
      const requestFullscreen = jest.fn(() => Promise.resolve())
      Object.assign(document.body, { requestFullscreen })

      await fullscreen.enter()
      expect(requestFullscreen).toHaveBeenCalled()
      expect(requestFullscreen.mock.instances[0]).toBe(document.body)
    })

    it('requests fullscreen to a specified element', async () => {
      const element = document.createElement('div')
      const requestFullscreen = jest.fn(() => Promise.resolve())
      Object.assign(element, { requestFullscreen })

      await fullscreen.enter(element)
      expect(requestFullscreen).toHaveBeenCalled()
      expect(requestFullscreen.mock.instances[0]).toBe(element)
    })

    it('fallbacks into document.body.webkitRequestFullscreen', () => {
      // WebKit prefixed function will not return Promise
      const webkitRequestFullscreen = jest.fn()

      Object.assign(document.body, {
        requestFullscreen: undefined,
        webkitRequestFullscreen,
      })

      fullscreen.enter()
      expect(webkitRequestFullscreen).toHaveBeenCalled()
      expect(webkitRequestFullscreen.mock.instances[0]).toBe(document.body)
    })
  })

  describe('#exit', () => {
    it('calls document.exitFullscreen', async () => {
      const exitFullscreen = jest.fn(() => Promise.resolve())
      Object.assign(document, { exitFullscreen })

      await fullscreen.exit()
      expect(exitFullscreen).toHaveBeenCalled()
      expect(exitFullscreen.mock.instances[0]).toBe(document)
    })

    it('fallbacks into document.webkitExitFullscreen', () => {
      // WebKit prefixed function will not return Promise
      const webkitExitFullscreen = jest.fn()

      Object.assign(document, {
        exitFullscreen: undefined,
        webkitExitFullscreen,
      })

      fullscreen.exit()
      expect(webkitExitFullscreen).toHaveBeenCalled()
      expect(webkitExitFullscreen.mock.instances[0]).toBe(document)
    })
  })

  describe('#toggle', () => {
    describe('when there is not a fullscreen element', () => {
      beforeEach(() => {
        Object.assign(document, { fullscreenElement: undefined })
      })

      it('calls document.body.requestFullscreen', async () => {
        const requestFullscreen = jest.fn(() => Promise.resolve())
        Object.assign(document.body, { requestFullscreen })

        await fullscreen.toggle()
        expect(requestFullscreen).toHaveBeenCalled()
      })

      it('fallbacks into document.body.webkitRequestFullscreen', async () => {
        // WebKit prefixed function will not return Promise
        const webkitRequestFullscreen = jest.fn()

        Object.assign(document.body, {
          requestFullscreen: undefined,
          webkitRequestFullscreen,
        })

        // fullscreen#toggle always returns a Promise even if called non-promise function
        const ret = fullscreen.toggle()
        expect(ret).toHaveProperty('then', expect.any(Function))

        await ret
        expect(webkitRequestFullscreen).toHaveBeenCalled()
      })
    })

    describe('when there is a fullscreen element', () => {
      beforeEach(() => {
        Object.assign(document, { fullscreenElement: document.body })
      })

      it('calls document.exitFullscreen', async () => {
        const exitFullscreen = jest.fn(() => Promise.resolve())
        Object.assign(document, { exitFullscreen })

        await fullscreen.toggle()
        expect(exitFullscreen).toHaveBeenCalled()
      })

      it('fallbacks into document.body.webkitRequestFullscreen', async () => {
        const webkitExitFullscreen = jest.fn()

        Object.assign(document, {
          exitFullscreen: undefined,
          webkitExitFullscreen,
        })

        const ret = fullscreen.toggle()
        expect(ret).toHaveProperty('then', expect.any(Function))

        await ret
        expect(webkitExitFullscreen).toHaveBeenCalled()
      })
    })
  })

  describe('#onChange', () => {
    it('subscribes fullscreenchange event on document', async () => {
      const callback = jest.fn()
      fullscreen.onChange(callback)

      document.dispatchEvent(new Event('fullscreenchange'))
      expect(callback).toHaveBeenCalled()
    })

    it('subscribes webkitfullscreenchange event on document', async () => {
      const callback = jest.fn()
      fullscreen.onChange(callback)

      document.dispatchEvent(new Event('webkitfullscreenchange'))
      expect(callback).toHaveBeenCalled()
    })
  })
})

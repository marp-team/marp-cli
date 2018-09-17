/** @jest-environment jsdom */
import watch from '../../src/templates/watch/watch'

const mockAddEventListener = jest.fn()

beforeEach(() => {
  mockAddEventListener.mockReset()
  ;(<any>window).WebSocket = jest.fn(() => ({
    addEventListener: mockAddEventListener,
  }))
})

afterEach(() => jest.restoreAllMocks())

describe('Watch mode notifier on browser context', () => {
  context('when window.__marpCliWatchWS is not defined', () => {
    it('does not call WebSocket', () => {
      watch()
      expect((<any>window).WebSocket).not.toHaveBeenCalled()
    })
  })

  context('when window.__marpCliWatchWS is not defined', () => {
    beforeEach(() =>
      ((<any>window).__marpCliWatchWS = 'ws://localhost:52000/test'))

    afterEach(() => delete (<any>window).__marpCliWatchWS)

    it('calls WebSocket', () => {
      watch()
      expect((<any>window).WebSocket).toHaveBeenCalled()
    })

    it('listens message event', () => {
      watch()
      expect(mockAddEventListener).toHaveBeenCalledTimes(1)
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )

      // Event callback
      const reload = jest.spyOn(location, 'reload').mockImplementation()
      const [, callback] = mockAddEventListener.mock.calls[0]

      callback({ data: 'ready' })
      expect(reload).not.toHaveBeenCalled()

      callback({ data: 'reload' })
      expect(reload).toHaveBeenCalled()
    })
  })
})

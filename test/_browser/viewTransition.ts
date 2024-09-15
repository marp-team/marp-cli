beforeEach(() => {
  Object.defineProperty(document, 'startViewTransition', {
    writable: true,
    configurable: true,
    value: jest.fn((callback: () => void) => {
      const updateCallbackDone = new Promise<void>((resolve) => {
        callback()
        resolve()
      })

      return Object.create(ViewTransition, {
        updateCallbackDone: {
          enumerable: true,
          value: updateCallbackDone,
        },
        ready: {
          enumerable: true,
          value: Promise.resolve(),
        },
        finished: {
          enumerable: true,
          value: updateCallbackDone,
        },
      })
    }),
  })
})

afterEach(() => {
  if ('startViewTransition' in document) {
    delete (document as any).startViewTransition
  }
})

export const skipTransition = jest.fn()

export const ViewTransition = Object.seal({ skipTransition })

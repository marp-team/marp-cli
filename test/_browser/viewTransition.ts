beforeEach(() => {
  Object.defineProperty(document, 'startViewTransition', {
    writable: true,
    configurable: true,
    value: jest.fn((callback: () => void) => {
      const domUpdated = new Promise<void>((resolve) => {
        callback()
        resolve()
      })

      return Object.create(ViewTransition, {
        domUpdated: {
          enumerable: true,
          value: domUpdated,
        },
        ready: {
          enumerable: true,
          value: Promise.resolve(),
        },
        finished: {
          enumerable: true,
          value: domUpdated,
        },
      })
    }),
  })
})

export const skipTransition = jest.fn()

export const ViewTransition = Object.seal({ skipTransition })

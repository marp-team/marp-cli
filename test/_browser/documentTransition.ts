beforeEach(() => {
  Object.defineProperty(document, 'createDocumentTransition', {
    writable: true,
    configurable: true,
    value: jest.fn(() => Object.create(DocumentTransition)),
  })
})

export const setElement = jest.fn()
export const start = jest.fn(async (callback) => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  callback()
  await new Promise((resolve) => setTimeout(resolve, 250)) // 250ms transition duration
})
export const abandon = jest.fn()

const DocumentTransition = Object.seal({ setElement, start, abandon })

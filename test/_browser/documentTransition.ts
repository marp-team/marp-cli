beforeEach(() => {
  Object.defineProperty(document, 'createDocumentTransition', {
    writable: true,
    configurable: true,
    value: jest.fn(() => Object.create(DocumentTransition)),
  })
})

export const setElement = jest.fn()
export const start = jest.fn(async (callback) => callback())
export const abandon = jest.fn()

const DocumentTransition = Object.seal({ setElement, start, abandon })

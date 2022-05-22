const _MediaQueryList = jest.fn()

_MediaQueryList.prototype = {
  get matches() {
    return false
  },
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn((query) =>
    Object.assign(new MediaQueryList(), { media: query })
  ),
})

Object.defineProperty(window, 'MediaQueryList', {
  writable: true,
  value: _MediaQueryList,
})

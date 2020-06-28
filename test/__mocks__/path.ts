let mode: string | undefined

const path = jest.requireActual('path')
const pathMock: any = {
  posix: () => (mode = 'posix'),
  win32: () => (mode = 'win32'),
  reset: () => (mode = undefined),
}

const pathProxy = new Proxy(pathMock, {
  get: (target, prop) => {
    if (prop === '__esModule') return true
    if (prop === 'default') return pathProxy
    if (prop in target) return target[prop]
    return mode === undefined ? path[prop] : path[mode][prop]
  },
})

module.exports = pathProxy

afterEach(() => pathMock.reset())

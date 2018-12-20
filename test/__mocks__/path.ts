let mode: string | undefined

const path = require.requireActual('path')
const pathMock: any = {
  posix: () => (mode = 'posix'),
  win32: () => (mode = 'win32'),
  reset: () => (mode = undefined),
}

module.exports = new Proxy(pathMock, {
  get: (target, prop) => {
    if (prop in target) return target[prop]
    return mode === undefined ? path[prop] : path[mode][prop]
  },
})

afterEach(() => pathMock.reset())

jest.mock('wrap-ansi')
jest.mock('./src/utils/stdin')

require('css.escape') // Polyfill for CSS.escape

CSS.registerProperty = jest.fn()

process.env.FORCE_COLOR = '0'

// https://github.com/nodejs/undici/issues/4374
if (process.versions.node.startsWith('18.')) {
  const { File, Blob } = require('node:buffer')

  global.File = File
  global.Blob = Blob
}

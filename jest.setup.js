jest.mock('wrap-ansi')
jest.mock('./src/utils/stdin')

require('css.escape') // Polyfill for CSS.escape

CSS.registerProperty = jest.fn()

process.env.FORCE_COLOR = '0'

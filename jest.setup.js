jest.mock('wrap-ansi')
jest.mock('./src/utils/stdin')

require('css.escape') // Polyfill for CSS.escape

process.env.FORCE_COLOR = '0'

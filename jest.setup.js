jest.mock('wrap-ansi')

require('css.escape') // Polyfill for CSS.escape

process.env.FORCE_COLOR = '0'

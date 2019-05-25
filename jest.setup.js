const { enterTestMode } = require('carlo')

enterTestMode()

jest.mock('wrap-ansi')

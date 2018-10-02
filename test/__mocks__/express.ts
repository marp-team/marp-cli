const express = require.requireActual('express')

express.application.listen = jest.fn((port, callback) => callback())

module.exports = express

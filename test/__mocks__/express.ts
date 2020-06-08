const express = jest.requireActual('express')

express.application.listen = jest.fn((port) => {})
express.application.listen.mockReturnValue({
  on: (event, callback) => {
    callback()
  },
})

module.exports = express

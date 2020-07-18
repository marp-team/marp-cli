const express = jest.requireActual('express')

express.application.listen = jest.fn(() => {
  // no ops
})

express.application.listen.mockReturnValue({
  on: (_, callback) => {
    callback()
  },
})

module.exports = express

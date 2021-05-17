import { EventEmitter } from 'events'

const express = jest.requireActual('express')

express.__errorOnListening = undefined
express.application.listen = jest.fn(() => {
  const serverMock = Object.assign(new EventEmitter(), {
    close: (callback) => callback(),
  })

  setTimeout(() => {
    if (express.__errorOnListening) {
      serverMock.emit('error', express.__errorOnListening)
    } else {
      serverMock.emit('listening')
    }
  }, 0)

  return serverMock
})

module.exports = express

beforeEach(() => {
  express.__errorOnListening = undefined
})

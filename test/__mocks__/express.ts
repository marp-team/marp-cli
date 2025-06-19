import { EventEmitter } from 'node:events'

const express = jest.requireActual('express')

express.__mocked = true
express.__errorOnListening = undefined

const { listen } = express.application

express.application.listen = (...args) => {
  if (!express.__mocked) {
    return listen.apply(express.application, args)
  }

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
}

module.exports = express

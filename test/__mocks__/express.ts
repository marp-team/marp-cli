import { EventEmitter } from 'events'

const express = jest.requireActual('express')

express.application.listen = jest.fn(() => {
  const serverMock = Object.assign(new EventEmitter(), {
    close: (callback) => callback(),
  })

  setTimeout(() => serverMock.emit('listening'), 0)

  return serverMock
})

module.exports = express

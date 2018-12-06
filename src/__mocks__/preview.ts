import { EventEmitter } from 'events'

const preview = require.requireActual('../preview')
const { carlo } = preview

class CarloAppMock extends EventEmitter {
  load = jest.fn().mockResolvedValue(0)
  exit = jest.fn().mockResolvedValue(0)
}

preview.carloMock = () => {
  const app = new CarloAppMock()
  const mockedCarlo = { launch: jest.fn(() => app) }

  preview.carlo = mockedCarlo
  return { app, carlo: mockedCarlo }
}

preview.carloOriginal = () => (preview.carlo = carlo)
preview.carloUndefined = () => (preview.carlo = undefined)

export = preview

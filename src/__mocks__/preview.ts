const preview = require.requireActual('../preview')
const { carlo } = preview

preview.carloMock = () => {
  const app = {
    load: jest.fn().mockResolvedValue(0),
    on: jest.fn(),
    exit: jest.fn().mockResolvedValue(0),
  }
  const mockedCarlo = { launch: jest.fn(() => app) }

  preview.carlo = mockedCarlo
  return { app, carlo: mockedCarlo }
}
preview.carloOriginal = () => (preview.carlo = carlo)
preview.carloUndefined = () => (preview.carlo = undefined)

export = preview

const preview = require.requireActual('../preview')
const { carlo } = preview

preview.carloMock = () => (preview.carlo = jest.fn())
preview.carloOriginal = () => (preview.carlo = carlo)
preview.carloUndefined = () => (preview.carlo = undefined)

export = preview

const fs = require.requireActual('fs')

fs.__mockWriteFile = (mockFn = (_, __, callback) => callback()) =>
  jest.spyOn(fs, 'writeFile').mockImplementation(mockFn)

module.exports = fs

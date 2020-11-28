import { promisify } from 'util'

const fs = jest.requireActual('fs')

fs.writeFile[promisify.custom] = (path, data) =>
  new Promise<void>((resolve, reject) =>
    fs.writeFile(path, data, (e) => (e ? reject(e) : resolve()))
  )

fs.__mockWriteFile = (mockFn = (_, __, callback) => callback()) =>
  jest.spyOn(fs, 'writeFile').mockImplementation(mockFn)

module.exports = fs

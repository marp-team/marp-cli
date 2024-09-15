import { promisify } from 'node:util'

const fs = jest.requireActual('node:fs')

let writeFileMockSpy: jest.SpyInstance | undefined
let writeFilePromiseMockSpy: jest.SpyInstance | undefined

afterEach(() => {
  writeFileMockSpy?.mockRestore()
  writeFileMockSpy = undefined

  writeFilePromiseMockSpy?.mockRestore()
  writeFilePromiseMockSpy = undefined
})

fs.writeFile[promisify.custom] = (path, data) =>
  new Promise<void>((resolve, reject) =>
    fs.writeFile(path, data, (e) => (e ? reject(e) : resolve()))
  )

fs.__mockWriteFile = (mockFn = (_, __, callback) => callback()) => {
  if (!writeFilePromiseMockSpy) {
    writeFilePromiseMockSpy = jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation(fs.writeFile[promisify.custom])
  }

  if (!writeFileMockSpy) {
    writeFileMockSpy = jest.spyOn(fs, 'writeFile').mockImplementation(mockFn)
  }

  return writeFileMockSpy
}

module.exports = fs

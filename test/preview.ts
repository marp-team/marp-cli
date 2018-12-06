import path from 'path'
import { File } from '../src/file'
import * as preview from '../src/preview'

let carloMock

const { FilePreview, ServerPreview } = preview
const previewMock: any = preview

jest.mock('../src/preview')

beforeEach(() => (carloMock = previewMock.carloMock()))
afterEach(() => previewMock.carloOriginal())

const assetFn = fn => path.resolve(__dirname, fn)
const assetFile = fn => new File(assetFn(fn))

const previewTestCase = (factory: () => preview.Preview) => {
  it('extends Preview abstract class', () =>
    expect(factory()).toBeInstanceOf(preview.Preview))

  describe('#open', () => {
    it('launches Chrome instance and load registered file', async () => {
      const instance = factory()
      await instance.open()

      expect(carloMock.carlo.launch).toBeCalledWith(
        expect.objectContaining({ title: 'Marp CLI' })
      )
      expect(carloMock.app.load).toBeCalledWith(instance.file.path)
    })
  })

  describe('#close', () => {
    it("closes Chrome through Carlo's App.exit() while opening", async () => {
      const instance = factory()
      await instance.close()
      expect(carloMock.app.exit).not.toBeCalled()

      await instance.open()
      await instance.close()
      expect(carloMock.app.exit).toBeCalled()
    })
  })

  describe('#on', () => {
    it('adds callback to carlo app emitter while opening', async () => {
      const instance = factory()
      const callback = jest.fn()
      expect(() => instance.on('exit', callback)).toThrow()

      await instance.open()
      expect(() => instance.on('exit', callback)).not.toThrow()

      carloMock.app.emit('exit')
      expect(callback).toBeCalled()
    })
  })
}

describe('FilePreview', () => {
  const instance = (file = assetFile('_files/1.md')) => new FilePreview(file)
  previewTestCase(instance)
})

describe('ServerPreview', () => {
  const instance = (url = 'http://localhost:8080') => new ServerPreview(url)
  previewTestCase(instance)

  it('registers file instance to redirect with data URI format', () => {
    expect(instance().file.path).toMatch(/^data:text\/html/)
    expect(instance().file.path).toContain('meta http-equiv="refresh"')
  })

  context('with passing malicious URL', () => {
    const maliciousURL = '\'" /><leaked-tag /><meta data-x="'

    it('encodes to formatted URI to prevent XSS', () =>
      expect(instance(maliciousURL).file.path).not.toContain('<leaked-tag />'))
  })
})

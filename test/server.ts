import path from 'path'
import { ConvertType } from '../src/converter'
import { CLIError } from '../src/error'
import { Server } from '../src/server'

jest.mock('express')

describe('Server', () => {
  const converterMock: any = (opts = {}) => ({
    convertFile: jest.fn(),
    options: {
      inputDir: path.resolve(__dirname, '_files'),
      type: ConvertType.html,
      ...opts,
    },
  })

  it('creates instance from converter', () => {
    const converter = converterMock()
    const instance = new Server(converter)

    expect(instance.converter).toBe(converter)
    expect(instance.inputDir).toBe(converter.options.inputDir)
    expect(instance.port).toBe(8080)
    expect(instance.server).toBeUndefined()
  })

  context('when passed converter has not specified inputDir option', () => {
    it('throws CLIError', () =>
      expect(
        () => new Server(converterMock({ inputDir: undefined }))
      ).toThrowError(CLIError))
  })

  context('when PORT environment variable is specified', () => {
    beforeEach(() => {
      process.env.PORT = '54321'
    })

    afterEach(() => {
      delete process.env.PORT
    })

    it('uses specified port number to serve', () =>
      expect(new Server(converterMock()).port).toBe(54321))
  })

  describe('#start', () => {
    it('triggers setup of express server and starts listening', async () => {
      const server = new Server(converterMock())
      await server.start()

      expect(server.server!.listen).toBeCalledWith(8080, expect.any(Function))
    })
  })
})

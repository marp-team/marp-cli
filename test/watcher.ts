import chokidar from 'chokidar'
import * as cli from '../src/cli'
import { File } from '../src/file'
import { Watcher } from '../src/watcher'

jest
  .mock('chokidar', () => ({
    watch: jest.fn(() => ({
      on: jest.fn(function() {
        return this
      }),
    })),
  }))
  .mock('../src/watcher')

describe('Watcher', () => {
  describe('.watch', () => {
    const { watch } = Watcher
    const convertFiles = jest.fn()
    const converterStub = { convertFiles: convertFiles.mockResolvedValue(0) }

    beforeEach(() => jest.spyOn(cli, 'info').mockImplementation())

    it('starts watching passed path by chokidar', async () => {
      const events = { onConverted: jest.fn(), onError: jest.fn() }
      const file = new File('test.md')
      const watcher = watch('test.md', <any>{
        events,
        converter: converterStub,
        finder: async () => [file],
      })

      expect(watcher).toBeInstanceOf(Watcher)
      expect(chokidar.watch).toHaveBeenCalledWith('test.md', expect.anything())

      const { on } = watcher.chokidar
      expect(on).toHaveBeenCalledWith('change', expect.any(Function))
      expect(on).toHaveBeenCalledWith('add', expect.any(Function))

      // Trigger converter if filepath is matched to finder files
      for (const [, convertFunc] of (<jest.Mock>on).mock.calls) {
        convertFiles.mockClear()
        await convertFunc('test.md')
        expect(convertFiles).toHaveBeenCalledTimes(1)

        const [files, onConverted] = convertFiles.mock.calls[0]
        expect(files).toContain(file)

        events.onConverted.mockClear()
        onConverted({ file: {} })
        expect(events.onConverted).toHaveBeenCalled()

        // Error handling
        events.onError.mockClear()
        convertFiles.mockImplementationOnce(() => {
          throw new Error('Error occurred')
        })

        await convertFunc('test.md')
        expect(events.onError).toHaveBeenCalledTimes(1)
      }
    })
  })
})

import { Marp } from '@marp-team/marp-core'
import { ResolvedEngine } from '../src/engine'

afterEach(() => jest.restoreAllMocks())

describe('ResolvedEngine', () => {
  describe('#resolve', () => {
    it('returns ResolvedEngine class with resolved class', async () => {
      const resolvedEngine = await ResolvedEngine.resolve(Marp)

      expect(resolvedEngine.klass).toBe(Marp)
      expect((await ResolvedEngine.resolve('@marp-team/marp-core')).klass).toBe(
        resolvedEngine.klass
      )

      // Return with the first resolved class
      expect(
        (await ResolvedEngine.resolve(['__invalid_module__', Marp])).klass
      ).toBe(Marp)
    })
  })

  describe('#resolveDefaultEngine', () => {
    it('returns ResolvedEngine class with Marp Core which is resolved from current directory', async () => {
      const importSpy = jest.spyOn(
        ResolvedEngine as any,
        '_silentImportOrRequire'
      )
      const resolvedEngine = await ResolvedEngine.resolveDefaultEngine()

      expect(importSpy).toHaveBeenCalledWith('@marp-team/marp-core')

      const marpCoreModule: typeof import('@marp-team/marp-core') =
        await importSpy.mock.results[0].value

      expect(resolvedEngine.klass).toBe(marpCoreModule.default)
    })

    it('returns ResolvedEngine class with a function engine to return natively-bundled Marp Core with Promise if failed to resolve from current directory', async () => {
      jest
        .spyOn(ResolvedEngine as any, '_silentImportOrRequire')
        .mockImplementationOnce(async () => null)

      const resolvedEngine = await ResolvedEngine.resolveDefaultEngine()
      expect(resolvedEngine.klass).toBe(Marp)
    })
  })
})

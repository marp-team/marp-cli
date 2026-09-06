import path from 'node:path'
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
      const importSpy = jest.spyOn(ResolvedEngine as any, '_silentImport')
      const resolvedEngine = await ResolvedEngine.resolveDefaultEngine()

      expect(importSpy).toHaveBeenCalledWith('@marp-team/marp-core')

      const marpCoreModule: typeof import('@marp-team/marp-core') =
        await importSpy.mock.results[1].value

      expect(resolvedEngine.klass).toBe(marpCoreModule.default)
    })

    it('prefers the full entry when it is available', async () => {
      const FullMarp = class extends Marp {}
      const importSpy = jest
        .spyOn(ResolvedEngine as any, '_silentImport')
        .mockResolvedValueOnce({ default: FullMarp })

      const resolvedEngine = await ResolvedEngine.resolveDefaultEngine()

      expect(resolvedEngine.klass).toBe(FullMarp)
      expect(importSpy).toHaveBeenCalledTimes(1)
      expect(importSpy).toHaveBeenCalledWith('@marp-team/marp-core/full')
    })

    it('returns ResolvedEngine class with a function engine to return natively-bundled Marp Core with Promise if failed to resolve from current directory', async () => {
      jest.spyOn(ResolvedEngine as any, '_silentImport').mockResolvedValue(null)

      const resolvedEngine = await ResolvedEngine.resolveDefaultEngine()
      expect(resolvedEngine.klass).toBe(Marp)
    })
  })

  describe('#getPackage', () => {
    it('returns the package of an engine imported from an ES module', async () => {
      const engine = await ResolvedEngine.resolve(
        path.join(__dirname, '_configs/custom-engine/custom-engine.mjs')
      )

      expect(await engine.getPackage()).toMatchObject({
        name: 'custom-project',
        version: '0.1.2',
      })
    })

    it('retains the entry package through nested default exports', async () => {
      const engine = await ResolvedEngine.resolve(
        './reexport.mjs',
        path.join(__dirname, '_configs/custom-engine/marp.config.js')
      )

      expect(engine.klass).toBe(Marp)
      expect(await engine.getPackage()).toMatchObject({
        name: 'custom-project',
        version: '0.1.2',
      })
    })

    it('returns null for a directly supplied class without a module path', async () => {
      const engine = await ResolvedEngine.resolve(class extends Marp {})

      expect(await engine.getPackage()).toBeNull()
    })
  })
})

import Marp from '@marp-team/marp-core'
import resolve, { ResolvedEngine } from '../src/engine'

jest.mock('../src/engine')

describe('Engine', () => {
  const coreModule = '@marp-team/marp-core'
  const marpitModule = '@marp-team/marpit'

  describe('.resolve', () => {
    it('returns ResolvedEngine class with resolved class', async () => {
      expect((await resolve(Marp)).klass).toBe(Marp)
      expect((await resolve(coreModule)).klass.name).toBe('Marp')

      // Return with the first resolved class
      expect((await resolve(['__invalid_module__', Marp])).klass).toBe(Marp)
    })

    it("loads browser script from defined in module's marpBrowser section", async () => {
      const finder = <jest.Mock>(<any>ResolvedEngine.prototype).findClassPath

      // Core (defined marpBrowser)
      finder.mockImplementation(() => require.resolve(coreModule))

      expect((await resolve(Marp)).browserScript).toBeTruthy()
      expect((await resolve(coreModule)).browserScript).toBeTruthy()

      // Marpit (not defined marpBrowser)
      finder.mockImplementation(() => require.resolve(marpitModule))
      expect((await resolve(marpitModule)).browserScript).toBeUndefined()
    })
  })
})

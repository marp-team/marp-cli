import Marp from '@marp-team/marp-core'
import resolve from '../src/engine'

describe('Engine', () => {
  describe('.resolve', () => {
    it('returns ResolvedEngine class with resolved class', async () => {
      const resolvedEngine = await resolve(Marp)

      expect(resolvedEngine.klass).toBe(Marp)
      expect((await resolve('@marp-team/marp-core')).klass).toBe(
        resolvedEngine.klass
      )

      // Return with the first resolved class
      expect((await resolve(['__invalid_module__', Marp])).klass).toBe(Marp)
    })
  })
})

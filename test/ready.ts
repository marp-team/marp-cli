import path from 'path'
import fs from 'fs'
import { useSpy } from './_helpers/spy'
import { MarpReadyScript } from '../src/ready'

describe('Ready script resolvers', () => {
  describe('MarpReadyScript', () => {
    describe('#bundled', () => {
      it('returns <script> tag loaded bundled JS from @marp-team/marp-core', async () => {
        const bundle = path.join('@marp-team', 'marp-core', 'lib', 'browser.js')
        const spy = jest.spyOn(fs, 'readFile')

        return useSpy(
          [spy],
          async () => {
            spy.mockImplementation((_, cb) => cb(0, new Buffer('bundled')))
            const script = await MarpReadyScript.bundled()

            expect(spy.mock.calls[0][0]).toContain(bundle)
            expect(script).toBe('<script defer>bundled</script>')
          },
          false
        )
      })
    })

    describe('#cdn', () => {
      it("returns <script> tag to load @marp-team/marp-core's browser bundle from CDN", async () => {
        const script = await MarpReadyScript.cdn()
        const matcher = /^<script defer src="(.+?)"><\/script>$/

        expect(script).toMatch(matcher)
        expect(script.match(matcher)[1]).toBe(
          'https://cdn.jsdelivr.net/npm/@marp-team/marp-core/lib/browser.js'
        )
      })
    })
  })
})

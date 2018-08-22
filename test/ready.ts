import fs from 'fs'
import { useSpy } from './_helpers/spy'
import { MarpReadyScript } from '../src/ready'

describe('Ready script resolvers', () => {
  describe('MarpReadyScript', () => {
    describe('#bundled', () => {
      it('returns <script> tag loaded bundled JS from @marp-team/marp-core', async () => {
        const readFileSpy = jest.spyOn(fs, 'readFile')

        useSpy(
          [readFileSpy],
          async () => {
            readFileSpy.mockImplementation((file, callback) => {
              expect(file).toContain('@marp-team/marp-core/lib/browser.js')
              callback(undefined, new Buffer('bundledJS'))
            })

            const script = await MarpReadyScript.bundled()
            expect(script).toBe('<script defer>bundledJS</script>')
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

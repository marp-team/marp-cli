import context from './_helpers/context'
import { useSpy } from './_helpers/spy'
import marpCli from '../src/marp-cli'

const { version } = require('../package.json')
const coreVersion = require('@marp-team/marp-core/package.json').version

describe('Marp CLI', () => {
  ;['--version', '-v'].forEach(cmd => {
    context(`with ${cmd} option`, () => {
      it('outputs package versions about cli and core', () => {
        const exit = jest.spyOn(process, 'exit')
        const log = jest.spyOn(console, 'log')

        useSpy([exit, log], () => {
          marpCli([cmd])
          expect(exit).toHaveBeenCalledWith(0)

          const [logged] = log.mock.calls[0]
          expect(logged).toContain(`@marp-team/marp-cli v${version}`)
          expect(logged).toContain(`@marp-team/marp-core v${coreVersion}`)
        })
      })
    })
  })

  it('returns exit code 1', () => expect(marpCli()).resolves.toBe(1))
})

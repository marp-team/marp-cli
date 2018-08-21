import context from './_helpers/context'
import { useSpy } from './_helpers/spy'
import marpCli from '../src/marp-cli'

const { version } = require('../package.json')
const coreVersion = require('@marp-team/marp-core/package.json').version

describe('Marp CLI', () => {
  const confirmVersion = (...cmd: string[]) => {
    it('outputs package versions about cli and core', async () => {
      const exit = jest.spyOn(process, 'exit')
      const log = jest.spyOn(console, 'log')
      const error = jest.spyOn(console, 'error')

      return useSpy([exit, log, error], async () => {
        await marpCli(cmd)
        expect(exit).toHaveBeenCalledWith(0)

        const [logged] = log.mock.calls[0]
        expect(logged).toContain(`@marp-team/marp-cli v${version}`)
        expect(logged).toContain(`@marp-team/marp-core v${coreVersion}`)
      })
    })
  }
  ;['--version', '-v'].forEach(cmd =>
    context(`with ${cmd} option`, () => confirmVersion(cmd))
  )

  const confirmHelp = (...cmd: string[]) => {
    it('outputs help to stderr', async () => {
      const exit = jest.spyOn(process, 'exit')
      const error = jest.spyOn(console, 'error')

      return useSpy([exit, error], async () => {
        expect(await marpCli(cmd)).toBe(0)
        expect(error).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      })
    })
  }
  ;[null, ['--help'], ['-h']].forEach(cmd =>
    context(`with ${cmd || 'empty'} option`, () => confirmHelp(...(cmd || [])))
  )
})

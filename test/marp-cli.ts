import fs from 'fs'
import path from 'path'
import context from './_helpers/context'
import { useSpy } from './_helpers/spy'
import marpCli from '../src/marp-cli'
import * as cli from '../src/cli'
import { Converter } from '../src/converter'
import { CLIError } from '../src/error'

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

  context('when passed file is not found', () => {
    it('outputs warning and help with exit code 1', () => {
      const warn = jest.spyOn(console, 'warn')
      const error = jest.spyOn(console, 'error')

      return useSpy([warn, error], async () => {
        expect(await marpCli(['_NOT_FOUND_FILE_'])).toBe(1)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Not found'))
        expect(error).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      })
    })
  })

  context('with passing a file', () => {
    const onePath = path.resolve(__dirname, './_files/1.md')

    it('converts file with Converter#convertFiles', () => {
      const cliInfo = jest.spyOn(cli, 'info')
      const write = jest.spyOn(fs, 'writeFile')

      return useSpy([cliInfo, write], async () => {
        write.mockImplementation((_, __, callback) => callback())

        expect(await marpCli([onePath])).toBe(0)
        expect(cliInfo).toHaveBeenCalledWith(expect.stringContaining('1 file'))
        expect(cliInfo).toHaveBeenCalledWith(
          expect.stringMatching(/1\.md => .+1\.html/)
        )
      })
    })

    it('outputs to stdout when output is stdout', () => {
      const cliInfo = jest.spyOn(cli, 'info')
      const log = jest.spyOn(console, 'log')

      return useSpy([cliInfo, log], async () => {
        expect(await marpCli([onePath, '-o', '-'])).toBe(0)
        expect(log).toHaveBeenCalledTimes(1)
      })
    })

    it('prints error and return error code when CLIError is raised', () => {
      const cliInfo = jest.spyOn(cli, 'info')
      const cliError = jest.spyOn(cli, 'error')
      const converter = jest.spyOn(Converter.prototype, 'convertFiles')

      return useSpy([cliInfo, cliError, converter], async () => {
        converter.mockImplementation(() => Promise.reject(new CLIError('FAIL')))

        expect(await marpCli([onePath])).toBe(1)
        expect(cliError).toHaveBeenCalledWith(expect.stringContaining('FAIL'))
      })
    })
  })

  context('with passing directory', () => {
    const folder = path.resolve(__dirname, './_files')

    it('finds out markdown files recursively', () => {
      const cliInfo = jest.spyOn(cli, 'info')
      const converter = jest.spyOn(Converter.prototype, 'convertFiles')

      return useSpy([cliInfo, converter], async () => {
        converter.mockImplementation(() => [])

        expect(await marpCli([folder])).toBe(0)
        expect(cliInfo).toHaveBeenCalledWith(expect.stringContaining('4 files'))
      })
    })
  })
})

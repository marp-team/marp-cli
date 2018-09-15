import fs from 'fs'
import getStdin from 'get-stdin'
import path from 'path'
import marpCli from '../src/marp-cli'
import * as cli from '../src/cli'
import { File } from '../src/file'
import { Converter, ConvertType } from '../src/converter'
import { CLIError } from '../src/error'

const { version } = require('../package.json')
const coreVersion = require('@marp-team/marp-core/package.json').version

afterEach(() => jest.restoreAllMocks())

describe('Marp CLI', () => {
  const confirmVersion = (...cmd: string[]) => {
    it('outputs package versions about cli and core', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation()

      jest.spyOn(console, 'error').mockImplementation()
      jest.spyOn(process, 'exit').mockImplementationOnce(code => {
        throw new CLIError('EXIT', code)
      })

      expect(await marpCli(cmd)).toBe(0)

      const [logged] = log.mock.calls[0]
      expect(logged).toContain(`@marp-team/marp-cli v${version}`)
      expect(logged).toContain(`@marp-team/marp-core v${coreVersion}`)
    })
  }
  ;['--version', '-v'].forEach(cmd =>
    context(`with ${cmd} option`, () => confirmVersion(cmd))
  )

  const confirmHelp = (...cmd: string[]) => {
    it('outputs help to stderr', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation()

      expect(await marpCli(cmd)).toBe(0)
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Usage'))
    })
  }
  ;[null, ['--help'], ['-h']].forEach(cmd =>
    context(`with ${cmd || 'empty'} option`, () => confirmHelp(...(cmd || [])))
  )

  const confirmPDF = (...cmd: string[]) => {
    it('converts file by Converter with PDF type', async () => {
      const cvtFiles = jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation()

      jest.spyOn(cli, 'info').mockImplementation()

      await marpCli(cmd)
      expect(cvtFiles).toHaveBeenCalled()

      const converter: any = cvtFiles.mock.instances[0]
      expect(converter.options.type).toBe(ConvertType.pdf)
    })
  }

  context('when passed file is not found', () => {
    it('outputs warning and help with exit code 1', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation()
      const error = jest.spyOn(console, 'error').mockImplementation()

      expect(await marpCli(['_NOT_FOUND_FILE_'])).toBe(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Not found'))
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Usage'))
    })
  })

  context('with --engine option', () => {
    it('prints error and return error code when passed module is invalid', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation()

      expect(await marpCli(['--engine', '@marp-team/invalid'])).toBe(1)
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('The specified engine has not resolved.')
      )
    })
  })

  context('with passing a file', () => {
    const onePath = path.resolve(__dirname, './_files/1.md')

    it('converts file', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      jest
        .spyOn(fs, 'writeFile')
        .mockImplementation((_, __, callback) => callback())

      expect(await marpCli([onePath])).toBe(0)
      expect(cliInfo).toHaveBeenCalledWith(
        expect.stringContaining('1 markdown')
      )
      expect(cliInfo).toHaveBeenCalledWith(
        expect.stringMatching(/1\.md => .+1\.html/)
      )
    })

    it('prints error and return error code when CLIError is raised', async () => {
      const cliError = jest.spyOn(cli, 'error').mockImplementation()

      jest.spyOn(cli, 'info').mockImplementation()
      jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation(() => Promise.reject(new CLIError('FAIL', 123)))

      expect(await marpCli([onePath])).toBe(123)
      expect(cliError).toHaveBeenCalledWith(expect.stringContaining('FAIL'))
    })

    context('with --pdf option', () => confirmPDF(onePath, '--pdf'))

    context('with -o option', () => {
      it('converts file and output to stdout when -o is "-"', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(cli, 'info').mockImplementation()

        expect(await marpCli([onePath, '-o', '-'])).toBe(0)
        expect(stdout).toHaveBeenCalledTimes(1)
      })

      context('when extension is .pdf', () =>
        confirmPDF(onePath, '-o', 'example.pdf')
      )
    })

    context('with configuration file', () => {
      const confDir = path.resolve(__dirname, './_files/configs')

      it('uses configuration file found from process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => path.resolve(confDir, './basic/'))

        expect(await marpCli(['md.txt'])).toBe(0)

        const html = stdout.mock.calls[0][0].toString()
        expect(html).toContain('<b>html</b>')
      })

      it('uses marp section in package.json that is found in process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => path.resolve(confDir, './package-json/'))

        expect(await marpCli(['md.txt', '-o', '-'])).toBe(0)

        const html = stdout.mock.calls[0][0].toString()
        expect(html).toContain('@theme gaia')
      })

      context('when --config-file / -c option is passed', () => {
        it('prints error when specified config is not found', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          expect(await marpCli(['--config-file', '_NOT_FOUND_FILE_'])).toBe(1)
          expect(error).toHaveBeenCalledTimes(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('_NOT_FOUND_FILE_')
          )
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Could not find or parse configuration')
          )
        })

        it('applies specified config', async () => {
          const stdout = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation()

          jest.spyOn(console, 'warn').mockImplementation()

          const conf = path.resolve(confDir, './marpit/config.js')
          expect(await marpCli(['-c', conf, onePath, '-o', '-'])).toBe(0)

          const html = stdout.mock.calls[0][0].toString()
          expect(html).not.toContain('@theme default') // Marpit engine has not default theme
        })

        it('allows custom engine specified in js config', async () => {
          const stdout = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation()

          jest.spyOn(console, 'warn').mockImplementation()
          jest
            .spyOn(process, 'cwd')
            .mockImplementation(() => path.resolve(confDir, './custom-engine/'))

          expect(await marpCli(['md.txt', '-o', '-'])).toBe(0)

          const html = stdout.mock.calls[0][0].toString()
          expect(html).toContain('<b>custom</b>')
          expect(html).toContain('/* custom */')
        })
      })
    })
  })

  context('with passing directory', () => {
    const folder = path.resolve(__dirname, './_files')

    it('finds out markdown files recursively', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation(() => [])

      expect(await marpCli([folder])).toBe(0)
      expect(cliInfo).toHaveBeenCalledWith(
        expect.stringContaining('4 markdowns')
      )
    })
  })

  context('with passing from stdin', () => {
    it('converts markdown came from stdin and outputs to stdout', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      jest.spyOn(getStdin, 'buffer').mockResolvedValue(new Buffer('# markdown'))

      // @ts-ignore: reset cached stdin buffer
      File.stdinBuffer = undefined

      expect(await marpCli()).toBe(0)
      expect(cliInfo).toHaveBeenCalledWith(
        expect.stringContaining('<stdin> => <stdout>')
      )
      expect(stdout).toHaveBeenCalled()
    })
  })
})

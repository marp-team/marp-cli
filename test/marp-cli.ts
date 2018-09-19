import fs from 'fs'
import getStdin from 'get-stdin'
import path from 'path'
import marpCli from '../src/marp-cli'
import * as cli from '../src/cli'
import { File } from '../src/file'
import { Converter, ConvertType } from '../src/converter'
import { CLIError } from '../src/error'
import { Watcher } from '../src/watcher'

const { version } = require('../package.json')
const coreVersion = require('@marp-team/marp-core/package.json').version

jest
  .mock('fs')
  .mock('mkdirp')
  .mock('../src/watcher', () => jest.genMockFromModule('../src/watcher'))

afterEach(() => jest.restoreAllMocks())

describe('Marp CLI', () => {
  const assetFn = fn => path.resolve(__dirname, fn)

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

  context('with --input-dir option', () => {
    const files = assetFn('_files')

    let writeFile: jest.Mock
    beforeEach(() => (writeFile = (<any>fs).__mockWriteFile()))

    it('converts files in specified dir', async () => {
      jest.spyOn(cli, 'info').mockImplementation()

      expect(await marpCli(['--input-dir', files])).toBe(0)
      expect(writeFile).toHaveBeenCalledTimes(4)
      writeFile.mock.calls.forEach(([fn]) => expect(fn).toMatch(/\.html$/))
    })

    it('prints error and return error code with invalid option(s)', async () => {
      const err = jest.spyOn(console, 'error').mockImplementation()
      jest.spyOn(console, 'warn').mockImplementation()

      // Pass file path, not folder
      expect(await marpCli(['--input-dir', assetFn('_files/1.md')])).toBe(1)
      expect(err).toHaveBeenCalledWith(
        expect.stringContaining('is not directory.')
      )

      // Pass not found path
      err.mockReset()
      expect(await marpCli(['--input-dir', assetFn('__NOT_FOUND__')])).toBe(1)
      expect(err).toHaveBeenCalledWith(expect.stringContaining('is not found.'))

      // Pass together with regular input files
      err.mockReset()
      expect(await marpCli(['test.md', '--input-dir', files])).toBe(1)
      expect(err).toHaveBeenCalledWith(
        expect.stringContaining(
          'Cannot pass files together with input directory'
        )
      )
    })

    context('when the output folder is specified by -o option', () => {
      it('converts markdowns with keeping folder structure', async () => {
        const args = ['--input-dir', files, '-o', assetFn('dist')]

        jest.spyOn(cli, 'info').mockImplementation()

        expect(await marpCli(args)).toBe(0)
        expect(writeFile).toHaveBeenCalledTimes(4)

        const outputFiles = writeFile.mock.calls.map(([fn]) => fn)
        expect(outputFiles).toContain(assetFn('dist/1.html'))
        expect(outputFiles).toContain(assetFn('dist/2.html'))
        expect(outputFiles).toContain(assetFn('dist/3.html'))
        expect(outputFiles).toContain(assetFn('dist/subfolder/5.html'))
      })
    })

    context('with specified by configuration file', () => {
      const confFile = assetFn('_configs/input-dir/.marprc.yml')
      const slides = assetFn('_configs/input-dir/slides')
      const distHtml = assetFn('_configs/input-dir/dist/nested/slide.html')

      it('resolves relative directory path from conf dir', async () => {
        const findDir = jest.spyOn(File, 'findDir')
        jest.spyOn(console, 'warn').mockImplementation()

        expect(await marpCli(['-c', confFile])).toBe(0)
        expect(findDir).toHaveBeenCalledWith(slides)
        expect(writeFile).toHaveBeenCalledWith(
          distHtml,
          expect.any(Buffer),
          expect.anything()
        )
      })
    })
  })

  context('with --theme-set option', () => {
    const filePath = assetFn('_files/1.md')
    const themes = assetFn('_files/themes')
    const themeA = assetFn('_files/themes/a.css')
    const themeB = assetFn('_files/themes/b.css')
    const themeC = assetFn('_files/themes/nested/c.css')

    let convert: jest.SpyInstance

    beforeEach(() => {
      convert = jest.spyOn(Converter.prototype, 'convert')

      jest.spyOn(cli, 'info').mockImplementation()
      ;(<any>fs).__mockWriteFile()
    })

    context('with specified single file', () => {
      it('becomes to be able to use specified additional theme', async () => {
        expect(
          await marpCli(['--theme-set', themeA, '--theme', 'a', filePath])
        ).toBe(0)
        expect(convert).toBeCalledTimes(1)
        expect((await convert.mock.results[0].value).rendered.css).toContain(
          '@theme a'
        )
      })
    })

    context('with specified multiple files', () => {
      const baseArgs = [filePath, '--theme-set', themeB, themeC]

      it('becomes to be able to use multiple additional themes', async () => {
        for (const name of ['b', 'c']) {
          convert.mockClear()

          expect(await marpCli([...baseArgs, '--theme', name])).toBe(0)
          expect(convert).toBeCalledTimes(1)
          expect((await convert.mock.results[0].value).rendered.css).toContain(
            `@theme ${name}`
          )
        }
      })
    })

    context('with specified directory', () => {
      const baseArgs = theme => [filePath, '--theme-set', theme]

      it('becomes to be able to use the all css files in directory', async () => {
        for (const name of ['a', 'b', 'c']) {
          convert.mockClear()

          expect(await marpCli([...baseArgs(themes), '--theme', name])).toBe(0)
          expect(convert).toBeCalledTimes(1)
          expect((await convert.mock.results[0].value).rendered.css).toContain(
            `@theme ${name}`
          )
        }
      })

      context('when CSS file is not found from directory', () => {
        const dir = assetFn('_files/subfolder')

        it('outputs warning and continue conversion', async () => {
          const warn = jest.spyOn(console, 'warn').mockImplementation()

          expect(await marpCli(baseArgs(dir))).toBe(0)
          expect(convert).toBeCalledTimes(1)
          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Not found additional theme CSS files')
          )
        })
      })
    })
  })

  context('with passing a file', () => {
    const onePath = assetFn('_files/1.md')

    it('converts file', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      ;(<any>fs).__mockWriteFile()

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

    context('with -w option', () => {
      it('starts watching by Watcher.watch()', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        ;(<any>fs).__mockWriteFile()

        expect(await marpCli([onePath, '-w'])).toBe(0)
        expect(Watcher.watch).toHaveBeenCalledWith([onePath], expect.anything())
      })
    })

    context('with configuration file', () => {
      it('uses configuration file found from process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/basic/'))

        expect(await marpCli(['md.md'])).toBe(0)

        const html = stdout.mock.calls[0][0].toString()
        expect(html).toContain('<b>html</b>')
      })

      it('uses marp section in package.json that is found in process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/package-json/'))

        expect(await marpCli(['md.md', '-o', '-'])).toBe(0)

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

          const conf = assetFn('_configs/marpit/config.js')
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
            .mockImplementation(() => assetFn('_configs/custom-engine/'))

          expect(await marpCli(['md.md', '-o', '-'])).toBe(0)

          const html = stdout.mock.calls[0][0].toString()
          expect(html).toContain('<b>custom</b>')
          expect(html).toContain('/* custom */')
        })
      })
    })
  })

  context('with passing directory', () => {
    it('finds out markdown files recursively', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation(() => [])

      expect(await marpCli([assetFn('_files')])).toBe(0)
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

import { EventEmitter } from 'events'
import fs from 'fs'
import getStdin from 'get-stdin'
import path from 'path'
import stripAnsi from 'strip-ansi'
import marpCli from '../src/marp-cli'
import * as cli from '../src/cli'
import { File } from '../src/file'
import { Converter, ConvertType } from '../src/converter'
import { ResolvedEngine } from '../src/engine'
import { CLIError } from '../src/error'
import * as preview from '../src/preview'
import { Server } from '../src/server'
import { ThemeSet } from '../src/theme'
import { Watcher } from '../src/watcher'

const { version } = require('../package.json')
const coreVersion = require('@marp-team/marp-core/package.json').version
const marpitVersion = require('@marp-team/marpit/package.json').version
const previewMock: any = preview

jest.mock('fs')
jest.mock('mkdirp')
jest.mock('../src/preview')
jest.mock('../src/watcher', () => jest.genMockFromModule('../src/watcher'))

afterEach(() => jest.restoreAllMocks())

describe('Marp CLI', () => {
  const assetFn = fn => path.resolve(__dirname, fn)

  for (const cmd of ['--version', '-v'])
    context(`with ${cmd} option`, () => {
      let log: jest.SpyInstance<Console['log']>
      let findClassPath: jest.SpyInstance<ResolvedEngine['findClassPath']>

      beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation()
        findClassPath = jest
          .spyOn(<any>ResolvedEngine.prototype, 'findClassPath')
          .mockImplementation()
      })

      const mockEnginePath = path =>
        findClassPath.mockImplementation(() => path)

      it('outputs package versions about cli and bundled core', async () => {
        expect(await marpCli([cmd])).toBe(0)
        expect(log).toBeCalledWith(
          expect.stringContaining(`@marp-team/marp-cli v${version}`)
        )
        expect(log).toBeCalledWith(
          expect.stringContaining(
            `bundled @marp-team/marp-core v${coreVersion}`
          )
        )
      })

      context('with specified Marpit engine', () => {
        const cmds = [cmd, '--engine', '@marp-team/marpit']

        beforeEach(() =>
          mockEnginePath(
            assetFn('../node_modules/@marp-team/marpit/lib/index.js')
          )
        )

        it('outputs using engine name and version', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toBeCalledWith(
            expect.stringContaining(`@marp-team/marpit v${marpitVersion}`)
          )
        })
      })

      context('with custom engine in project', () => {
        const cmds = [cmd, '-c', assetFn('_configs/custom-engine/file.js')]

        beforeEach(() =>
          mockEnginePath(assetFn('_configs/custom-engine/custom-engine.js'))
        )

        it('outputs project name and version', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toBeCalledWith(
            expect.stringContaining('custom-project v0.1.2')
          )
        })
      })

      context('with functional engine in config file directly', () => {
        const cmds = [cmd, '-c', assetFn('_configs/custom-engine/anonymous.js')]

        it('outputs using the customized engine', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toBeCalledWith(
            expect.stringContaining('customized engine')
          )
        })
      })
    })

  for (const cmd of [null, '--help', '-h'])
    context(`with ${cmd || 'empty'} option`, () => {
      const run = (...args) => marpCli([...(cmd ? [cmd] : []), ...args])

      let error: jest.SpyInstance<Console['error']>

      beforeEach(() => {
        error = jest.spyOn(console, 'error').mockImplementation()
      })

      it('outputs help to stderr', async () => {
        expect(await run()).toBe(0)
        expect(error).toBeCalledWith(expect.stringContaining('Usage'))
      })

      describe('Preview option', () => {
        afterEach(() => previewMock.carloOriginal())

        context('when carlo module is loaded (Node >= 7.6.x)', () =>
          it('outputs help about --preview option', async () => {
            previewMock.carloMock()

            expect(await run()).toBe(0)
            expect(error).toBeCalledWith(expect.stringContaining('--preview'))
            expect(error).toBeCalledWith(
              expect.not.stringContaining('Requires Node >= 7.6.x')
            )
          })
        )

        context('when carlo module cannot load (Node < 7.6.x)', () =>
          it('outputs warning of Node version in --preview option', async () => {
            previewMock.carloUndefined()

            expect(await run()).toBe(0)
            expect(error).toBeCalledWith(expect.stringContaining('--preview'))
            expect(error).toBeCalledWith(
              expect.stringContaining('Requires Node >= 7.6.x')
            )
          })
        )

        context('when CLI is running in an official Docker image', () => {
          beforeEach(() => (process.env.IS_DOCKER = '1'))
          afterEach(() => delete process.env.IS_DOCKER)

          it('does not output help about --preview option', async () => {
            expect(await run()).toBe(0)
            expect(error).toBeCalledWith(
              expect.not.stringContaining('--preview')
            )
          })
        })
      })
    })

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

    it('allows using theme css in specified dir', async () => {
      jest.spyOn(cli, 'info').mockImplementation()
      expect(await marpCli(['--input-dir', files, '--theme', 'a'])).toBe(0)

      for (const [, buffer] of writeFile.mock.calls)
        expect(buffer.toString()).toContain('/* @theme a */')
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

    context('with --server option', () => {
      it('starts listening server and watcher for passed directory', async () => {
        const info = jest.spyOn(cli, 'info')
        info.mockImplementation()

        const serverStart = jest.spyOn(Server.prototype, 'start')
        serverStart.mockResolvedValue(0)

        await marpCli(['--input-dir', files, '--server'])
        expect(info).toBeCalledWith(
          expect.stringContaining('http://localhost:8080/')
        )
        expect(serverStart).toBeCalledTimes(1)
        expect(Watcher.watch).toHaveBeenCalledWith(
          expect.arrayContaining([files]),
          expect.objectContaining({
            mode: Watcher.WatchMode.Notify,
          })
        )
      })

      context('with --preview option', () => {
        let open: jest.SpyInstance<preview.Preview['open']>

        const run = () =>
          marpCli(['--input-dir', files, '--server', '--preview'])

        beforeEach(() => {
          jest.spyOn(cli, 'info').mockImplementation()
          jest.spyOn(Server.prototype, 'start').mockResolvedValue(0)

          open = jest.spyOn(preview.Preview.prototype, 'open')
        })

        afterEach(() => previewMock.carloOriginal())

        context('when carlo module is loaded (Node >= 7.6.x)', () => {
          let app: EventEmitter & { [func: string]: jest.Mock }

          beforeEach(() => (app = previewMock.carloMock().app))

          it('opens preview window through Preview.open()', async () => {
            await run()
            expect(open).toBeCalledTimes(1)
            expect(app.load).toBeCalledTimes(1)

            const exit = jest.spyOn(process, 'exit').mockImplementation()
            app.emit('exit')
            expect(exit).toBeCalled()
          })

          context('when CLI is running in an official Docker image', () => {
            beforeEach(() => (process.env.IS_DOCKER = '1'))
            afterEach(() => delete process.env.IS_DOCKER)

            it('ignores --preview option with warning', async () => {
              const warn = jest.spyOn(cli, 'warn').mockImplementation()

              await run()
              expect(open).not.toBeCalled()
              expect(warn).toBeCalledWith(
                expect.stringContaining('preview option was ignored')
              )
            })
          })
        })

        context('when carlo module cannot load (Node < 7.6)', () => {
          it('ignores --preview option with warning', async () => {
            previewMock.carloUndefined()
            const warn = jest.spyOn(cli, 'warn').mockImplementation()

            await run()
            expect(open).not.toBeCalled()
            expect(warn).toBeCalledWith(
              expect.stringContaining('preview option was ignored')
            )
          })
        })
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

  context('with --theme option', () => {
    let convert: jest.MockInstance<any>
    let info: jest.MockInstance<any>

    beforeEach(() => {
      convert = jest.spyOn(Converter.prototype, 'convert')
      info = jest.spyOn(cli, 'info')

      info.mockImplementation()
      ;(<any>fs).__mockWriteFile()
    })

    context('when passed value is theme name', () => {
      it('overrides theme to specified', async () => {
        const args = [assetFn('_files/1.md'), '--theme', 'gaia']
        expect(await marpCli(args)).toBe(0)

        const { css } = (await convert.mock.results[0].value).rendered
        expect(css).toContain('@theme gaia')
      })
    })

    context('when passed value is a file path to theme CSS', () => {
      const cssFile = assetFn('_files/themes/a.css')

      it('overrides theme to specified CSS', async () => {
        const args = [assetFn('_files/1.md'), '--theme', cssFile]
        expect(await marpCli(args)).toBe(0)

        const { css } = (await convert.mock.results[0].value).rendered
        expect(css).toContain('/* @theme a */')

        const converter = <Converter>convert.mock.instances[0]
        const { themeSet } = converter.options
        const theme = themeSet.themes.get(cssFile)!

        expect(theme.overridenName).not.toBeUndefined()
        expect(converter.options.theme).toBe(theme.overridenName)
        expect(themeSet.fnForWatch).toContain(cssFile)
      })
    })

    context('when passed value is a path to directory', () => {
      const themesPath = assetFn('_files/themes')

      it('prints error with advice and return error code', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()
        const args = [assetFn('_files/1.md'), '--theme', themesPath]

        expect(await marpCli(args)).toBe(1)
        expect(cliError).toHaveBeenCalledWith(
          expect.stringContaining('Directory cannot pass to theme option')
        )
        expect(info).toHaveBeenCalledTimes(1)

        const advice = stripAnsi(info.mock.calls[0][0])
        expect(advice).toContain('use --theme-set option')
      })
    })
  })

  context('with --theme-set option', () => {
    const filePath = assetFn('_files/1.md')
    const themes = assetFn('_files/themes')
    const themeA = assetFn('_files/themes/a.css')
    const themeB = assetFn('_files/themes/b.css')
    const themeC = assetFn('_files/themes/nested/c.css')

    let convert: jest.MockInstance<Converter['convert']>
    let observeSpy: jest.MockInstance<ThemeSet['observe']>

    beforeEach(() => {
      convert = jest.spyOn(Converter.prototype, 'convert')
      observeSpy = jest.spyOn(ThemeSet.prototype, 'observe')

      jest.spyOn(cli, 'info').mockImplementation()
      ;(<any>fs).__mockWriteFile()
    })

    context('with specified single file', () => {
      it('becomes to be able to use specified additional theme', async () => {
        expect(
          await marpCli(['--theme-set', themeA, '--theme', 'a', filePath])
        ).toBe(0)
        expect(convert).toBeCalledTimes(1)

        const { css } = (await convert.mock.results[0].value).rendered
        expect(css).toContain('@theme a')
        expect(observeSpy).toHaveBeenCalledWith(filePath, 'a')
      })
    })

    context('with specified multiple files', () => {
      const baseArgs = [filePath, '--theme-set', themeB, themeC]

      it('becomes to be able to use multiple additional themes', async () => {
        for (const name of ['b', 'c']) {
          convert.mockClear()
          observeSpy.mockClear()

          expect(await marpCli([...baseArgs, '--theme', name])).toBe(0)
          expect(convert).toBeCalledTimes(1)
          expect((await convert.mock.results[0].value).rendered.css).toContain(
            `@theme ${name}`
          )
          expect(observeSpy).toHaveBeenCalledWith(filePath, name)
        }
      })
    })

    context('with specified directory', () => {
      const baseArgs = theme => [filePath, '--theme-set', theme]

      it('becomes to be able to use the all css files in directory', async () => {
        for (const name of ['a', 'b', 'c']) {
          convert.mockClear()
          observeSpy.mockClear()

          expect(await marpCli([...baseArgs(themes), '--theme', name])).toBe(0)
          expect(convert).toBeCalledTimes(1)
          expect((await convert.mock.results[0].value).rendered.css).toContain(
            `@theme ${name}`
          )
          expect(observeSpy).toHaveBeenCalledWith(filePath, name)
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
        expect(html).toContain('@theme b')
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
          expect(html).toContain('@theme a')
        })

        it('allows custom engine class specified in js config', async () => {
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

        it('allows custom engine function specified in js config', async () => {
          jest.spyOn(process.stdout, 'write').mockImplementation()
          jest.spyOn(console, 'warn').mockImplementation()

          const conf = assetFn('_configs/custom-engine/anonymous.js')
          const md = assetFn('_configs/custom-engine/md.md')
          const { engine } = require(conf)

          expect(await marpCli(['-c', conf, md, '-o', '-'])).toBe(0)
          expect(engine).toBeCalledWith(
            expect.objectContaining({ customOption: true })
          )
        })
      })
    })

    context('with --preview option', () => {
      afterEach(() => previewMock.carloOriginal())

      it('outputs warning and starts watching', async () => {
        const warn = jest.spyOn(cli, 'warn').mockImplementation()

        jest.spyOn(cli, 'info').mockImplementation()
        previewMock.carloMock()
        ;(<any>fs).__mockWriteFile()

        expect(await marpCli([onePath, '--preview'])).toBe(0)
        expect(warn).toBeCalledWith(
          expect.stringContaining('only in server mode')
        )
        expect(Watcher.watch).toBeCalledWith([onePath], expect.anything())
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

    context('with --server option', () => {
      it('treats passed directory as an input directory of the server', async () => {
        jest.spyOn(cli, 'info').mockImplementation()

        const serverStart = jest.spyOn(Server.prototype, 'start')
        serverStart.mockResolvedValue(0)

        await marpCli(['--server', assetFn('_files')])
        expect(serverStart).toBeCalledTimes(1)

        const server: any = serverStart.mock.instances[0]
        const converter: Converter = server.converter

        expect(converter.options.inputDir).toBe(assetFn('_files'))
      })
    })
  })

  context('with passing multiple files', () => {
    const baseArgs = [assetFn('_files/1.md'), assetFn('_files/2.mdown')]

    context('with --server option', () => {
      it('prints error and return error code', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation()

        expect(await marpCli([...baseArgs, '--server'])).toBe(1)
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining('specify just one directory')
        )
      })
    })
  })

  context('with passing from stdin', () => {
    it('converts markdown came from stdin and outputs to stdout', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      jest
        .spyOn(getStdin, 'buffer')
        .mockResolvedValue(Buffer.from('# markdown'))

      // reset cached stdin buffer
      ;(<any>File).stdinBuffer = undefined

      expect(await marpCli()).toBe(0)
      expect(cliInfo).toHaveBeenCalledWith(
        expect.stringContaining('<stdin> => <stdout>')
      )
      expect(stdout).toHaveBeenCalled()
    })
  })
})

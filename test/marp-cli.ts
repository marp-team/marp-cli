import { EventEmitter } from 'events'
import fs from 'fs'
import getStdin from 'get-stdin'
import path from 'path'
import stripAnsi from 'strip-ansi'
import marpCli from '../src/marp-cli'
import * as cli from '../src/cli'
import { Converter, ConvertType } from '../src/converter'
import { ResolvedEngine } from '../src/engine'
import { CLIError } from '../src/error'
import { File } from '../src/file'
import { Preview } from '../src/preview'
import { Server } from '../src/server'
import { ThemeSet } from '../src/theme'
import * as version from '../src/version'
import { Watcher } from '../src/watcher'

const cliVersion = require('../package.json').version
const coreVersion = require('@marp-team/marp-core/package.json').version
const marpitVersion = require('@marp-team/marpit/package.json').version
const previewEmitter = new EventEmitter() as Preview

jest.mock('fs')
jest.mock('get-stdin')
jest.mock('mkdirp')
jest.mock('../src/preview')
jest.mock('../src/watcher', () => jest.genMockFromModule('../src/watcher'))

beforeEach(() => {
  previewEmitter.removeAllListeners()
  jest
    .spyOn(Preview.prototype, 'on')
    .mockImplementation((e, func) => previewEmitter.on(e, func))
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('Marp CLI', () => {
  const assetFn = fn => path.resolve(__dirname, fn)

  for (const cmd of ['--version', '-v'])
    context(`with ${cmd} option`, () => {
      let log: jest.SpyInstance<void, any>
      let findClassPath: jest.SpyInstance

      beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation()
        findClassPath = jest
          .spyOn(ResolvedEngine.prototype as any, 'findClassPath')
          .mockImplementation()
      })

      const mockEnginePath = path =>
        findClassPath.mockImplementation(() => path)

      it('outputs package versions about cli and bundled core', async () => {
        // isMarpCore does not return correct result in Windows environment
        jest.spyOn(version, 'isMarpCore').mockImplementation(() => true)

        expect(await marpCli([cmd])).toBe(0)
        expect(log).toBeCalledWith(
          expect.stringContaining(`@marp-team/marp-cli v${cliVersion}`)
        )
        expect(log).toBeCalledWith(
          expect.stringContaining(
            `bundled @marp-team/marp-core v${coreVersion}`
          )
        )
      })

      context(
        'when resolved core has unexpected version against bundled',
        () => {
          const pkgJson = { name: '@marp-team/marp-core', version: '0.0.0' }
          const pkgPath = '../node_modules/@marp-team/marp-core/package.json'

          beforeEach(() => {
            jest.spyOn(version, 'isMarpCore').mockImplementation(() => true)

            findClassPath.mockImplementation(() =>
              assetFn('../node_modules/@marp-team/marp-core/lib/marp.js')
            )

            jest.doMock(pkgPath, () => pkgJson)
          })

          afterEach(() => jest.unmock(pkgPath))

          it('outputs resolved version as user-installed core', async () => {
            expect(await marpCli([cmd])).toBe(0)
            expect(log).toBeCalledWith(
              expect.stringContaining(
                'user-installed @marp-team/marp-core v0.0.0'
              )
            )
          })
        }
      )

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

      let error: jest.SpyInstance<ReturnType<Console['error']>, any>

      beforeEach(() => {
        error = jest.spyOn(console, 'error').mockImplementation()
      })

      it('outputs help to stderr', async () => {
        expect(await run()).toBe(0)
        expect(error).toBeCalledWith(expect.stringContaining('Usage'))
      })

      describe('Preview option', () => {
        it('outputs help about --preview option', async () => {
          expect(await run()).toBe(0)
          expect(error).toBeCalledWith(expect.stringContaining('--preview'))
        })

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
      expect(writeFile).toHaveBeenCalledTimes(5)
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
        expect(writeFile).toHaveBeenCalledTimes(5)

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

        const serverStart = jest.spyOn<any, any>(Server.prototype, 'start')
        serverStart.mockResolvedValue(0)

        await marpCli(['--input-dir', files, '--server'])
        expect(info.mock.calls.map(([m]) => m)).toContainEqual(
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
        const run = () =>
          marpCli(['--input-dir', files, '--server', '--preview'])

        beforeEach(() => {
          jest.spyOn(cli, 'info').mockImplementation()
          jest.spyOn<any, any>(Server.prototype, 'start').mockResolvedValue(0)
        })

        it('opens preview window through Preview.open()', async () => {
          await run()
          expect(Preview.prototype.open).toBeCalledTimes(1)
        })

        context('when CLI is running in an official Docker image', () => {
          beforeEach(() => (process.env.IS_DOCKER = '1'))
          afterEach(() => delete process.env.IS_DOCKER)

          it('ignores --preview option with warning', async () => {
            const warn = jest.spyOn(cli, 'warn').mockImplementation()

            await run()
            expect(Preview.prototype.open).not.toBeCalled()
            expect(warn.mock.calls.map(([m]) => m)).toContainEqual(
              expect.stringContaining('Preview option was ignored')
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
    let convert: jest.MockInstance<any, any>
    let info: jest.MockInstance<any, any>

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

        expect(theme.overrideName).not.toBeUndefined()
        expect(converter.options.globalDirectives.theme).toBe(
          theme.overrideName
        )
        expect(themeSet.fnForWatch).toContain(cssFile)
      })
    })

    context('when passed value is a path to directory', () => {
      const themesPath = assetFn('_files/themes')

      it('prints error with advice and return error code', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()
        const args = [assetFn('_files/1.md'), '--theme', themesPath]

        expect(await marpCli(args)).toBe(1)
        expect(cliError.mock.calls.map(([m]) => m)).toContainEqual(
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

    let convert: jest.MockInstance<ReturnType<Converter['convert']>, any>
    let observeSpy: jest.MockInstance<ReturnType<ThemeSet['observe']>, any>

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

    const conversion = async (...cmd: string[]): Promise<Converter> => {
      const cvtFiles = jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation()

      jest.spyOn(cli, 'info').mockImplementation()

      await marpCli(cmd)
      expect(cvtFiles).toHaveBeenCalled()

      return <any>cvtFiles.mock.instances[0]
    }

    it('converts file', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      ;(<any>fs).__mockWriteFile()

      expect(await marpCli([onePath])).toBe(0)

      const logs = cliInfo.mock.calls.map(([m]) => m)
      expect(logs).toContainEqual(expect.stringContaining('1 markdown'))
      expect(logs).toContainEqual(expect.stringMatching(/1\.md => .+1\.html/))
    })

    it('prints error and return error code when CLIError is raised', async () => {
      const cliError = jest.spyOn(cli, 'error').mockImplementation()

      jest.spyOn(cli, 'info').mockImplementation()
      jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation(() => Promise.reject(new CLIError('FAIL', 123)))

      expect(await marpCli([onePath])).toBe(123)
      expect(cliError.mock.calls.map(([m]) => m)).toContainEqual(
        expect.stringContaining('FAIL')
      )
    })

    context('with --pdf option', () => {
      it('converts file with PDF type', async () => {
        const cmd = [onePath, '--pdf']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pdf)
      })
    })

    context('with --pptx option', () => {
      it('converts file with PPTX type', async () => {
        const cmd = [onePath, '--pptx']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pptx)
      })
    })

    context('with --image option', () => {
      it('converts file with PNG type by specified png', async () => {
        const cmd = [onePath, '--image', 'png']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.png)
      })

      it('converts file with JPEG type by specified jpeg', async () => {
        const cmd = [onePath, '--image=jpeg']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.jpeg)
      })

      it('converts file with JPEG type by specified jpg (alias to jpeg)', async () => {
        const cmd = ['--image', 'jpg', onePath]
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.jpeg)
      })

      context('with --jpeg-quality option', () => {
        it('converts file with specified JPEG quality', async () => {
          const cmd = [onePath, '--image', 'jpg', '--jpeg-quality', '50']
          expect((await conversion(...cmd)).options.jpegQuality).toBe(50)
        })
      })
    })

    context('with --images option', () => {
      it('converts file with PNG type and enabled pages option by specified png', async () => {
        const converter = await conversion(onePath, '--images', 'png')
        expect(converter.options.type).toBe(ConvertType.png)
        expect(converter.options.pages).toBe(true)
      })

      it('converts file with JPEG type and enabled pages option by specified jpeg', async () => {
        const converter = await conversion(onePath, '--images=jpeg')
        expect(converter.options.type).toBe(ConvertType.jpeg)
        expect(converter.options.pages).toBe(true)
      })
    })

    context('with -o option', () => {
      it('converts file and output to stdout when -o is "-"', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(cli, 'info').mockImplementation()

        expect(await marpCli([onePath, '-o', '-'])).toBe(0)
        expect(stdout).toHaveBeenCalledTimes(1)
      })

      it('converts file with PDF type when extension is .pdf', async () => {
        const cmd = [onePath, '-o', 'example.pdf']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pdf)
      })

      it('converts file with PPTX type when extension is .pptx', async () => {
        const cmd = [onePath, '-o', 'example.pptx']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pptx)
      })

      it('converts file with PNG type when extension is .png', async () => {
        const cmd = [onePath, '-o', 'example.png']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.png)
      })

      it('converts file with JPEG type when extension is .jpg', async () => {
        const cmd = [onePath, '-o', 'example.jpg']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.jpeg)
      })

      it('converts file with JPEG type when extension is .jpeg', async () => {
        const cmd = [onePath, '-o', 'example.jpeg']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.jpeg)
      })

      it('prefers the specified type option to the output filename', async () => {
        const cmd = [onePath, '-o', 'example.png', '--pdf']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pdf)
      })
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
          jest.spyOn(console, 'warn').mockImplementation()

          const conf = assetFn('_configs/custom-engine/anonymous.js')
          const md = assetFn('_configs/custom-engine/md.md')
          const { engine } = require(conf)

          expect(await marpCli(['-c', conf, md, '--no-output'])).toBe(0)
          expect(engine).toBeCalledWith(
            expect.objectContaining({ customOption: true })
          )
        })
      })
    })

    context('with --preview / -p option', () => {
      let warn: jest.SpyInstance<ReturnType<Console['warn']>, any>

      beforeEach(
        () => (warn = jest.spyOn(console, 'warn').mockImplementation())
      )

      it('opens preview window through Preview.open()', async () => {
        await marpCli([onePath, '-p', '--no-output'])
        expect(Preview.prototype.open).toBeCalledTimes(1)

        // Simualte opening event
        previewEmitter.emit('opening', '<location>')
        expect(warn).toBeCalledWith(
          expect.stringContaining('Opening <location>')
        )
      })

      context('when CLI is running in an official Docker image', () => {
        beforeEach(() => (process.env.IS_DOCKER = '1'))
        afterEach(() => delete process.env.IS_DOCKER)

        it('ignores --preview option with warning', async () => {
          await marpCli([onePath, '--preview', '--no-output'])
          expect(Preview.prototype.open).not.toBeCalled()
          expect(warn).toBeCalledWith(
            expect.stringContaining('Preview option was ignored')
          )
        })
      })
    })
  })

  context('with passing directory', () => {
    it('finds out markdown files recursively', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      jest
        .spyOn<any, any>(Converter.prototype, 'convertFiles')
        .mockImplementation(() => [])

      expect(await marpCli([assetFn('_files')])).toBe(0)
      expect(cliInfo.mock.calls.map(([m]) => m)).toContainEqual(
        expect.stringContaining('5 markdowns')
      )
    })

    context('when glob special chars are included in real file path', () => {
      it('finds out a file correctly', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        expect(await marpCli([assetFn('_files/字/(non-ascii).md')])).toBe(0)
      })
    })

    context('when non-ASCII code is included in directory name', () => {
      it('finds out markdown files correctly', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        expect(await marpCli([assetFn('_files/字')])).toBe(0)
      })
    })

    context('with --server option', () => {
      it('treats passed directory as an input directory of the server', async () => {
        jest.spyOn(cli, 'info').mockImplementation()

        const serverStart = jest.spyOn<any, any>(Server.prototype, 'start')
        serverStart.mockResolvedValue(0)

        await marpCli(['--server', assetFn('_files')])
        expect(serverStart).toBeCalledTimes(1)

        const server: any = serverStart.mock.instances[0]
        const converter: Converter = server.converter

        expect(converter.options.inputDir).toBe(assetFn('_files'))
      })

      context('with --preview option', () => {
        it('opens served address through Preview.open()', async () => {
          jest.spyOn(console, 'warn').mockImplementation()

          await marpCli(['--server', assetFn('_files'), '--preview'])
          expect(Preview.prototype.open).toBeCalledTimes(1)
          expect(Preview.prototype.open).toBeCalledWith(
            expect.stringMatching(/^http:\/\/localhost:/)
          )
        })
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

    context('with --preview option', () => {
      it('opens 2 preview windows through Preview.open()', async () => {
        jest.spyOn(console, 'warn').mockImplementation()

        await marpCli([...baseArgs, '--preview', '--no-output'])
        expect(Preview.prototype.open).toBeCalledTimes(2)
      })
    })
  })

  context('with passing from stdin', () => {
    let cliInfo: jest.SpyInstance
    let stdout: jest.SpyInstance

    beforeEach(() => {
      cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      jest
        .spyOn(getStdin, 'buffer')
        .mockResolvedValue(Buffer.from('# markdown'))

      // reset cached stdin buffer
      ;(<any>File).stdinBuffer = undefined
    })

    it('converts markdown came from stdin and outputs to stdout', async () => {
      expect(await marpCli()).toBe(0)
      expect(cliInfo.mock.calls.map(([m]) => m)).toContainEqual(
        expect.stringContaining('<stdin> => <stdout>')
      )
      expect(stdout).toHaveBeenCalledWith(expect.any(Buffer))
    })

    context('with --stdin option as false', () => {
      it('does not convert stdin even if passed', async () => {
        jest.spyOn(console, 'error').mockImplementation()

        expect(await marpCli(['--stdin=false'])).toBe(0)
        expect(cliInfo.mock.calls.map(([m]) => m)).not.toContainEqual(
          expect.stringContaining('<stdin> => <stdout>')
        )
        expect(stdout).not.toHaveBeenCalledWith(expect.any(Buffer))
      })
    })
  })
})

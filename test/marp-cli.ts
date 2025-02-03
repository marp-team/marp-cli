import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { version as coreVersion } from '@marp-team/marp-core/package.json'
import { version as marpitVersion } from '@marp-team/marpit/package.json'
import * as cosmiconfigExplorer from 'cosmiconfig/dist/Explorer' // eslint-disable-line import-x/namespace
import stripAnsi from 'strip-ansi'
import { version as cliVersion } from '../package.json'
import { defaultFinders } from '../src/browser/finder'
import * as cli from '../src/cli'
import { Converter, ConvertType } from '../src/converter'
import { ResolvedEngine } from '../src/engine'
import { CLIError } from '../src/error'
import { File } from '../src/file'
import {
  ObservationHelper,
  cliInterface as marpCli,
  waitForObservation,
} from '../src/marp-cli'
import { Preview } from '../src/preview'
import { Server } from '../src/server'
import { ThemeSet } from '../src/theme'
import * as container from '../src/utils/container'
import * as stdin from '../src/utils/stdin'
import * as version from '../src/version'
import { Watcher } from '../src/watcher'

jest.mock('cosmiconfig')
jest.mock('../src/preview')
jest.mock('../src/utils/yargs')
jest.mock('../src/watcher', () => jest.createMockFromModule('../src/watcher'))

const { Explorer } = cosmiconfigExplorer as any
const observationHelpers: ObservationHelper[] = []
const previewEmitter = new EventEmitter() as unknown as Preview

const runForObservation = async (argv: string[]) => {
  const ret = await Promise.race([marpCli(argv), waitForObservation()])

  if (typeof ret !== 'object')
    throw new Error('runForObservation should observe')

  observationHelpers.push(ret)
  return ret
}

beforeEach(() => {
  previewEmitter.removeAllListeners()

  jest
    .spyOn(Preview.prototype, 'on')
    .mockImplementation((e, func) => previewEmitter.on(e, func))
})

afterEach(() => {
  let observationHelper: ObservationHelper | undefined

  while ((observationHelper = observationHelpers.shift())) {
    observationHelper.stop()
  }

  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('Marp CLI', () => {
  const assetFn = (fn: string) => path.resolve(__dirname, fn)

  for (const cmd of ['--version', '-v']) {
    describe(`with ${cmd} option`, () => {
      let log: jest.SpyInstance<void, any>
      let findClassPath: jest.SpyInstance

      beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation()
        findClassPath = jest
          .spyOn(ResolvedEngine.prototype as any, 'findClassPath')
          .mockImplementation()
      })

      const mockEnginePath = (path) =>
        findClassPath.mockImplementation(() => path)

      it('outputs package versions about cli and bundled core', async () => {
        // isMarpCore does not return correct result in Windows environment
        jest.spyOn(version, 'isMarpCore').mockResolvedValue(true)

        expect(await marpCli([cmd])).toBe(0)
        expect(log).toHaveBeenCalledWith(
          expect.stringContaining(`@marp-team/marp-cli v${cliVersion}`)
        )
        expect(log).toHaveBeenCalledWith(
          expect.stringContaining(`@marp-team/marp-core v${coreVersion}`)
        )
      })

      describe('when resolved core has unexpected version against bundled', () => {
        const pkgJson = { name: '@marp-team/marp-core', version: '0.0.0' }
        const pkgPath = '../node_modules/@marp-team/marp-core/package.json'

        beforeEach(() => {
          jest.spyOn(version, 'isMarpCore').mockResolvedValue(true)

          mockEnginePath(
            assetFn('../node_modules/@marp-team/marp-core/lib/marp.js')
          )

          jest.doMock(pkgPath, () => pkgJson)
        })

        afterEach(() => jest.unmock(pkgPath))

        it('outputs resolved version as user-installed core', async () => {
          expect(await marpCli([cmd])).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining(
              'user-installed @marp-team/marp-core v0.0.0'
            )
          )
        })
      })

      describe('with specified Marpit engine', () => {
        const cmds = [cmd, '--engine', '@marp-team/marpit']

        beforeEach(() =>
          mockEnginePath(
            assetFn('../node_modules/@marp-team/marpit/lib/index.js')
          )
        )

        it('outputs using engine name and version', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining(`@marp-team/marpit v${marpitVersion}`)
          )
        })
      })

      describe('with custom engine in project', () => {
        const cmds = [cmd, '-c', assetFn('_configs/custom-engine/file.js')]

        beforeEach(() =>
          mockEnginePath(assetFn('_configs/custom-engine/custom-engine.js'))
        )

        it('outputs project name and version', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining('custom-project v0.1.2')
          )
        })
      })

      describe('with functional engine in config file directly', () => {
        const cmds = [cmd, '-c', assetFn('_configs/custom-engine/anonymous.js')]

        it('outputs using the customized engine', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining('customized engine')
          )
        })
      })

      describe('with functional engine that returns Promise without resolving default export', () => {
        const cmds = [cmd, '-c', assetFn('_configs/custom-engine/import.js')]

        it('outputs using the customized engine', async () => {
          expect(await marpCli(cmds)).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining('customized engine')
          )
        })
      })
    })
  }

  for (const cmd of [null, '--help', '-h']) {
    describe(`with ${cmd || 'empty'} option`, () => {
      const run = (...args) => marpCli([...(cmd ? [cmd] : []), ...args])

      let log: jest.SpyInstance<void, any>

      beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation()
      })

      it('outputs help to stdout', async () => {
        expect(await run()).toBe(0)
        expect(log).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      })

      describe('Preview option', () => {
        it('outputs help about --preview option', async () => {
          expect(await run()).toBe(0)
          expect(log).toHaveBeenCalledWith(expect.stringContaining('--preview'))
        })

        describe('when CLI is running in an official Docker image', () => {
          it('does not output help about --preview option', async () => {
            jest
              .spyOn(container, 'isOfficialContainerImage')
              .mockReturnValue(true)

            expect(await run()).toBe(0)
            expect(log).toHaveBeenCalledWith(
              expect.not.stringContaining('--preview')
            )
          })
        })
      })

      describe('PPTX editable option', () => {
        it('outputs help about --pptx-editable option', async () => {
          expect(await run()).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining('--pptx-editable')
          )
        })

        describe('when CLI is running in an official Docker image', () => {
          it('does not output help about --pptx-editable option', async () => {
            jest
              .spyOn(container, 'isOfficialContainerImage')
              .mockReturnValue(true)

            expect(await run()).toBe(0)
            expect(log).toHaveBeenCalledWith(
              expect.not.stringContaining('--pptx-editable')
            )
          })
        })
      })
    })
  }

  describe('with DEBUG env', () => {
    it('shows enabling debug logging and set pattern', async () => {
      process.env.DEBUG = 'debug-pattern,debug-pattern:*'

      try {
        const warn = jest.spyOn(console, 'warn').mockImplementation()
        jest.spyOn(console, 'log').mockImplementation()

        expect(await marpCli(['-v'])).toBe(0)
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('Debug logging is enabled')
        )
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'Filter pattern: debug-pattern,debug-pattern:*'
          )
        )
      } finally {
        delete process.env.DEBUG
      }
    })
  })

  describe('when passed file is not found', () => {
    it('outputs warning and help with exit code 1', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation()
      const error = jest.spyOn(console, 'error').mockImplementation()

      expect(await marpCli(['_NOT_FOUND_FILE_'])).toBe(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Not found'))
      expect(error).toHaveBeenCalledWith(expect.stringContaining('Usage'))
    })
  })

  describe('with --engine option', () => {
    it('allows loading custom engine with ES modules', async () => {
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(console, 'warn').mockImplementation()

      expect(
        await marpCli([
          '--engine',
          assetFn('_configs/custom-engine/custom-engine.mjs'),
          '-o',
          '-',
          assetFn('_files/1.md'),
        ])
      ).toBe(0)

      const html = stdout.mock.calls[0][0].toString()
      expect(html).toContain('<b>custom</b>')
    })

    it('prints error and return error code when passed module is invalid', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation()

      expect(await marpCli(['--engine', '@marp-team/invalid'])).toBe(1)
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('The specified engine has not resolved.')
      )
    })

    it('uses require() instead of import() to resolve engine when ESM is not available in this context', async () => {
      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(ResolvedEngine, 'isESMAvailable').mockReturnValue(false)

      const silentImportSpy = jest.spyOn(ResolvedEngine as any, '_silentImport')
      const silentRequireSpy = jest.spyOn(
        ResolvedEngine as any,
        '_silentRequire'
      )

      await marpCli([
        '--engine',
        assetFn('_configs/custom-engine/custom-engine.mjs'),
      ])

      expect(silentImportSpy).not.toHaveBeenCalled()
      expect(silentRequireSpy).toHaveBeenCalled()
    })
  })

  describe('with --input-dir option', () => {
    const files = assetFn('_files')

    let writeFile: jest.SpyInstance

    beforeEach(() => {
      writeFile = jest.spyOn(fs.promises, 'writeFile').mockImplementation()
    })

    it('converts files in specified dir', async () => {
      jest.spyOn(cli, 'info').mockImplementation()

      expect(await marpCli(['--input-dir', files])).toBe(0)
      expect(writeFile).toHaveBeenCalledTimes(6)
      writeFile.mock.calls.forEach(([fn]) => expect(fn).toMatch(/\.html$/))
    })

    it('allows using theme css in specified dir', async () => {
      jest.spyOn(cli, 'info').mockImplementation()

      expect(await marpCli(['--input-dir', files, '--theme', 'a'])).toBe(0)

      for (const [, buffer] of writeFile.mock.calls) {
        expect(buffer.toString()).toContain('--theme-a')
      }
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
      err.mockClear()
      expect(await marpCli(['--input-dir', assetFn('__NOT_FOUND__')])).toBe(1)
      expect(err).toHaveBeenCalledWith(expect.stringContaining('is not found.'))

      // Pass together with regular input files
      err.mockClear()
      expect(await marpCli(['test.md', '--input-dir', files])).toBe(1)
      expect(err).toHaveBeenCalledWith(
        expect.stringContaining(
          'Cannot pass files together with input directory'
        )
      )
    })

    describe('when the directory path has included glob pattern', () => {
      it('converts files in specified dir', async () => {
        jest.spyOn(cli, 'info').mockImplementation()

        expect(await marpCli(['--input-dir', assetFn('_files/(sp)')])).toBe(0)
        expect(writeFile).toHaveBeenCalledTimes(1)
      })
    })

    describe('when the output folder is specified by -o option', () => {
      it('converts markdowns with keeping folder structure', async () => {
        jest.spyOn(cli, 'info').mockImplementation()

        expect(
          await marpCli(['--input-dir', files, '-o', assetFn('dist')])
        ).toBe(0)
        expect(writeFile).toHaveBeenCalledTimes(6)

        const outputFiles = writeFile.mock.calls.map(([fn]) => fn)
        expect(outputFiles).toContain(assetFn('dist/1.html'))
        expect(outputFiles).toContain(assetFn('dist/2.html'))
        expect(outputFiles).toContain(assetFn('dist/3.html'))
        expect(outputFiles).toContain(assetFn('dist/subfolder/5.html'))
      })
    })

    describe('with --server option', () => {
      it('starts listening server and watcher for passed directory', async () => {
        const info = jest.spyOn(cli, 'info').mockImplementation()
        const serverStart = jest
          .spyOn<any, any>(Server.prototype, 'start')
          .mockResolvedValue(0)

        await runForObservation(['--input-dir', files, '--server'])
        expect(info.mock.calls.map(([m]) => m)).toContainEqual(
          expect.stringContaining('http://localhost:8080/')
        )
        expect(serverStart).toHaveBeenCalledTimes(1)
        expect(Watcher.watch).toHaveBeenCalledWith(
          expect.arrayContaining([files]),
          expect.objectContaining({
            mode: Watcher.WatchMode.Notify,
          })
        )
      })

      describe('with --preview option', () => {
        const run = () =>
          runForObservation(['--input-dir', files, '--server', '--preview'])

        beforeEach(() => {
          jest.spyOn(cli, 'info').mockImplementation()
          jest.spyOn<any, any>(Server.prototype, 'start').mockResolvedValue(0)
        })

        it('opens preview window through Preview.open()', async () => {
          await run()
          expect(Preview.prototype.open).toHaveBeenCalledTimes(1)
        })

        describe('when CLI is running in an official Docker image', () => {
          it('ignores --preview option with warning', async () => {
            jest
              .spyOn(container, 'isOfficialContainerImage')
              .mockReturnValue(true)

            const warn = jest.spyOn(cli, 'warn').mockImplementation()

            await run()
            expect(Preview.prototype.open).not.toHaveBeenCalled()
            expect(warn.mock.calls.map(([m]) => m)).toContainEqual(
              expect.stringContaining('Preview option was ignored')
            )
          })
        })
      })
    })

    describe('with specified by configuration file', () => {
      const confFile = assetFn('_configs/input-dir/.marprc.yml')
      const slides = assetFn('_configs/input-dir/slides')
      const distHtml = assetFn('_configs/input-dir/dist/nested/slide.html')

      it('resolves relative directory path from conf dir', async () => {
        const findDir = jest.spyOn(File, 'findDir')
        jest.spyOn(console, 'warn').mockImplementation()

        expect(await marpCli(['-c', confFile])).toBe(0)
        expect(findDir).toHaveBeenCalledWith(slides)
        expect(writeFile).toHaveBeenCalledWith(distHtml, expect.any(Buffer))
      })
    })
  })

  describe('with --theme option', () => {
    let convert: jest.SpyInstance
    let info: jest.SpyInstance

    beforeEach(() => {
      convert = jest.spyOn(Converter.prototype, 'convert')
      info = jest.spyOn(cli, 'info').mockImplementation()

      jest.spyOn(fs.promises, 'writeFile').mockImplementation()
    })

    describe('when passed value is theme name', () => {
      it('overrides theme to specified', async () => {
        const args = [assetFn('_files/1.md'), '--theme', 'gaia']
        expect(await marpCli(args)).toBe(0)

        const { css } = (await convert.mock.results[0].value).rendered
        expect(css).toContain('@theme gaia')
      })
    })

    describe('when passed value is a file path to theme CSS', () => {
      const cssFile = assetFn('_files/themes/a.css')

      it('overrides theme to specified CSS', async () => {
        const args = [assetFn('_files/1.md'), '--theme', cssFile]
        expect(await marpCli(args)).toBe(0)

        const { css } = (await convert.mock.results[0].value).rendered
        expect(css).toContain('--theme-a')

        const converter: Converter = convert.mock.instances[0]
        const { themeSet } = converter.options
        const theme = themeSet.themes.get(cssFile)

        expect(theme?.overrideName).toBeDefined()
        expect(converter.options.globalDirectives.theme).toBe(
          theme?.overrideName
        )
        expect(themeSet?.fnForWatch).toContain(cssFile)
      })
    })

    describe('when passed value is a path to directory', () => {
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

  describe('with --theme-set option', () => {
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

      jest.spyOn(fs.promises, 'writeFile').mockImplementation()
      jest.spyOn(cli, 'info').mockImplementation()
    })

    describe('with specified single file', () => {
      it('becomes to be able to use specified additional theme', async () => {
        expect(
          await marpCli(['--theme-set', themeA, '--theme', 'a', filePath])
        ).toBe(0)
        expect(convert).toHaveBeenCalledTimes(1)

        const { css } = (await convert.mock.results[0].value).rendered
        expect(css).toContain('--theme-a')
        expect(observeSpy).toHaveBeenCalledWith(filePath, 'a')
      })
    })

    describe('with specified multiple files', () => {
      const baseArgs = [filePath, '--theme-set', themeB, themeC]

      it('becomes to be able to use multiple additional themes', async () => {
        for (const name of ['b', 'c']) {
          convert.mockClear()
          observeSpy.mockClear()

          expect(await marpCli([...baseArgs, '--theme', name])).toBe(0)
          expect(convert).toHaveBeenCalledTimes(1)
          expect((await convert.mock.results[0].value).rendered.css).toContain(
            `--theme-${name}`
          )
          expect(observeSpy).toHaveBeenCalledWith(filePath, name)
        }
      })
    })

    describe('with specified directory', () => {
      const baseArgs = (theme: string) => [filePath, '--theme-set', theme]

      it('becomes to be able to use the all css files in directory', async () => {
        for (const name of ['a', 'b', 'c']) {
          convert.mockClear()
          observeSpy.mockClear()

          expect(await marpCli([...baseArgs(themes), '--theme', name])).toBe(0)
          expect(convert).toHaveBeenCalledTimes(1)
          expect((await convert.mock.results[0].value).rendered.css).toContain(
            `--theme-${name}`
          )
          expect(observeSpy).toHaveBeenCalledWith(filePath, name)
        }
      })

      describe('when CSS file is not found from directory', () => {
        const dir = assetFn('_files/subfolder')

        it('outputs warning and continue conversion', async () => {
          const warn = jest.spyOn(console, 'warn').mockImplementation()

          expect(await marpCli(baseArgs(dir))).toBe(0)
          expect(convert).toHaveBeenCalledTimes(1)
          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Not found additional theme CSS files')
          )
        })
      })
    })
  })

  describe('with passing a file', () => {
    const onePath = assetFn('_files/1.md')

    const conversion = async (...cmd: string[]): Promise<Converter> => {
      const cvtFiles = jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation()
        .mockReset()

      jest.spyOn(cli, 'info').mockImplementation()

      await marpCli(cmd)
      expect(cvtFiles).toHaveBeenCalled()

      return cvtFiles.mock.instances[0] as any
    }

    it('converts file', async () => {
      jest.spyOn(fs.promises, 'writeFile').mockImplementation()
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

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

    describe('with browser options', () => {
      describe('with --browser option', () => {
        it('uses default browser finders when --browser is auto', async () => {
          expect(
            (await conversion(onePath, '--browser', 'auto')).options
              .browserManager['_finders']
          ).toStrictEqual(defaultFinders)

          // Case insensitive
          expect(
            (await conversion(onePath, '--browser', 'AUTo')).options
              .browserManager['_finders']
          ).toStrictEqual(defaultFinders)
        })

        it('uses default browser finders when --browser has no value', async () => {
          expect(
            (await conversion(onePath, '--browser')).options.browserManager[
              '_finders'
            ]
          ).toStrictEqual(defaultFinders)
        })

        it('uses only specific browser finder when --browser is a kind of browser', async () => {
          // chrome
          expect(
            (await conversion(onePath, '--browser', 'chrome')).options
              .browserManager['_finders']
          ).toStrictEqual(['chrome'])

          // edge
          expect(
            (await conversion(onePath, '--browser', 'edge')).options
              .browserManager['_finders']
          ).toStrictEqual(['edge'])

          // firefox
          expect(
            (await conversion(onePath, '--browser', 'firefox')).options
              .browserManager['_finders']
          ).toStrictEqual(['firefox'])

          // Case insensitive
          expect(
            (await conversion(onePath, '--browser', 'CHROME')).options
              .browserManager['_finders']
          ).toStrictEqual(['chrome'])
          expect(
            (await conversion(onePath, '--browser', 'edGE')).options
              .browserManager['_finders']
          ).toStrictEqual(['edge'])
          expect(
            (await conversion(onePath, '--browser', 'FireFox')).options
              .browserManager['_finders']
          ).toStrictEqual(['firefox'])
        })

        it('prints yargs error when --browser is unknown browser', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          expect(await marpCli([onePath, '--browser', 'unknown'])).toBe(1)

          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid values')
          )
        })

        it('uses a specific browser finder when browser option in configuration file is a kind of browser', async () => {
          const conf = assetFn('_configs/marpit/config.js')

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browser: 'firefox' },
          })

          expect(
            (await conversion(onePath, '--config', conf)).options
              .browserManager['_finders']
          ).toStrictEqual(['firefox'])
        })

        it('prints error when browser option in configuration file is unknown browser', async () => {
          const conf = assetFn('_configs/marpit/config.js')
          const error = jest.spyOn(console, 'error').mockImplementation()

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browser: 'UNKNOWN' },
          })

          expect(await marpCli([onePath, '--config', 'conf'])).toBe(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Unknown browser: UNKNOWN')
          )
        })

        it('uses the specific order of browser finders when --browser has comma-separated browsers', async () => {
          expect(
            (await conversion(onePath, '--browser', 'firefox,edge,chrome'))
              .options.browserManager['_finders']
          ).toStrictEqual(['firefox', 'edge', 'chrome'])

          // Trimming spaces
          expect(
            (await conversion(onePath, '--browser', ' edge , chrome ')).options
              .browserManager['_finders']
          ).toStrictEqual(['edge', 'chrome'])

          // Just ignore unknown browsers
          expect(
            (await conversion(onePath, '--browser', 'auto,firefox,unknown'))
              .options.browserManager['_finders']
          ).toStrictEqual(['firefox'])
        })

        it('uses a specific order of browser finders when browser option in configuration file is an array of browsers', async () => {
          const conf = assetFn('_configs/marpit/config.js')

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browser: ['edge', 'firefox', 'chrome'] },
          })

          expect(
            (await conversion(onePath, '--config', conf)).options
              .browserManager['_finders']
          ).toStrictEqual(['edge', 'firefox', 'chrome'])
        })

        it('prints error when --browser has comma-separated unknown browsers', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          expect(
            await marpCli([onePath, '--browser', 'unknown,browsers'])
          ).toBe(1)

          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid values')
          )
        })

        it('prints error when browser option in configuration file is an array of unknown browsers', async () => {
          const conf = assetFn('_configs/marpit/config.js')
          const error = jest.spyOn(console, 'error').mockImplementation()

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browser: ['unknown', 'browsers'] },
          })

          expect(await marpCli([onePath, '--config', 'conf'])).toBe(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('No available browsers: unknown, browsers')
          )
        })

        it('uses no browser finders when --no-browser has specified', async () => {
          expect(
            (await conversion(onePath, '--no-browser')).options.browserManager[
              '_finders'
            ]
          ).toStrictEqual([])
        })
      })

      describe('with --browser-path option', () => {
        it('uses the path as the preferred path of finder', async () => {
          expect(
            (await conversion(onePath, '--browser-path', '/path/to/browser'))
              .options.browserManager['_finderPreferredPath']
          ).toBe(path.resolve('/path/to/browser'))

          // Relative path
          const resolved = (
            await conversion(onePath, '--browser-path', './browser-executable')
          ).options.browserManager['_finderPreferredPath']

          expect(resolved).toBe(path.join(process.cwd(), 'browser-executable'))
        })

        it('uses a path from the configuration file as the preferred path of finder when browserPath option in configuration file is specified', async () => {
          const conf = assetFn('_configs/marpit/config.js')

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browserPath: '../test/browser/path' },
          })

          expect(
            (await conversion(onePath, '--config', conf)).options
              .browserManager['_finderPreferredPath']
          ).toBe(assetFn('_configs/test/browser/path'))
        })
      })

      describe('with --browser-protocol option', () => {
        it('uses the default protocol "cdp" when --browser-protocol is not defined', async () => {
          expect(
            (await conversion(onePath)).options.browserManager[
              '_preferredProtocol'
            ]
          ).toBe('cdp')

          // Negated option
          expect(
            (await conversion(onePath, '--no-browser-protocol')).options
              .browserManager['_preferredProtocol']
          ).toBe('cdp')
        })

        it('uses "cdp" when --browser-protocol is "cdp"', async () => {
          expect(
            (await conversion(onePath, '--browser-protocol', 'cdp')).options
              .browserManager['_preferredProtocol']
          ).toBe('cdp')

          // Case insensitive
          expect(
            (await conversion(onePath, '--browser-protocol', 'CDP')).options
              .browserManager['_preferredProtocol']
          ).toBe('cdp')
        })

        it('uses "webDriverBiDi" when --browser-protocol is "webdriver-bidi"', async () => {
          expect(
            (await conversion(onePath, '--browser-protocol', 'webdriver-bidi'))
              .options.browserManager['_preferredProtocol']
          ).toBe('webDriverBiDi')

          // Case insensitive
          expect(
            (await conversion(onePath, '--browser-protocol', 'WebDriver-BiDi'))
              .options.browserManager['_preferredProtocol']
          ).toBe('webDriverBiDi')
        })

        it('allows aliases for webdriver-bidi option in --browser-protocol', async () => {
          // "webdriver"
          expect(
            (await conversion(onePath, '--browser-protocol', 'webdriver'))
              .options.browserManager['_preferredProtocol']
          ).toBe('webDriverBiDi')

          // "bidi"
          expect(
            (await conversion(onePath, '--browser-protocol', 'bidi')).options
              .browserManager['_preferredProtocol']
          ).toBe('webDriverBiDi')
        })

        it('prints yargs error when --browser-protocol is unknown protocol', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          expect(
            await marpCli([onePath, '--browser-protocol', 'unknown'])
          ).toBe(1)

          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid values')
          )
        })

        it('prints error when browserProtocol option in configuration file is unknown protocol', async () => {
          const conf = assetFn('_configs/marpit/config.js')
          const error = jest.spyOn(console, 'error').mockImplementation()

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browserProtocol: 'UNKNOWN' },
          })

          expect(await marpCli([onePath, '--config', 'conf'])).toBe(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Unknown browser protocol: UNKNOWN')
          )
        })
      })

      describe('with --browser-timeout option', () => {
        it('uses the default timeout when --browser-timeout has defined no value', async () => {
          expect(
            (await conversion(onePath, '--browser-timeout')).options
              .browserManager.timeout
          ).toBeUndefined()

          // "true" also use the default timeout
          expect(
            (await conversion(onePath, '--browser-timeout', 'true')).options
              .browserManager.timeout
          ).toBeUndefined()
          expect(
            (await conversion(onePath, '--browser-timeout', 'TRUE')).options
              .browserManager.timeout
          ).toBeUndefined()
        })

        it('sets timeout as 0 when --browser-timeout is 0 or falsy value', async () => {
          expect(
            (await conversion(onePath, '--browser-timeout', '0')).options
              .browserManager.timeout
          ).toBe(0)

          // Negated option
          expect(
            (await conversion(onePath, '--no-browser-timeout')).options
              .browserManager.timeout
          ).toBe(0)

          // "false" also sets timeout as 0
          expect(
            (await conversion(onePath, '--no-browser-timeout', 'false')).options
              .browserManager.timeout
          ).toBe(0)
          expect(
            (await conversion(onePath, '--no-browser-timeout', 'FALSE')).options
              .browserManager.timeout
          ).toBe(0)
        })

        it('sets timeout as second when --browser-timeout is number', async () => {
          expect(
            (await conversion(onePath, '--browser-timeout', '42')).options
              .browserManager.timeout
          ).toBe(42000)

          // With "s" unit
          expect(
            (await conversion(onePath, '--browser-timeout', '60s')).options
              .browserManager.timeout
          ).toBe(60000)

          // Point number
          expect(
            (await conversion(onePath, '--browser-timeout', '1.234')).options
              .browserManager.timeout
          ).toBe(1234)
          expect(
            (await conversion(onePath, '--browser-timeout', '3.456789s'))
              .options.browserManager.timeout
          ).toBe(3456)
        })

        it('sets timeout as millisecond when --browser-timeout is number with ms unit', async () => {
          expect(
            (await conversion(onePath, '--browser-timeout', '5678ms')).options
              .browserManager.timeout
          ).toBe(5678)
        })

        it('prints error when --browser-timeout is unknown string', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          expect(await marpCli([onePath, '--browser-timeout', '???'])).toBe(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid number for timeout: ???')
          )
        })

        it('prints error when --browser-timeout is negative value', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          expect(await marpCli([onePath, '--browser-timeout', '-5'])).toBe(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid number for timeout: -5')
          )
        })

        it('sets timeout as second when browserTimeout option in configuration file is specified', async () => {
          const conf = assetFn('_configs/marpit/config.js')

          jest.spyOn(Explorer.prototype, 'load').mockResolvedValue({
            filepath: conf,
            config: { browserTimeout: 42 },
          })

          expect(
            (await conversion(onePath, '--config', conf)).options.browserManager
              .timeout
          ).toBe(42000)
        })
      })
    })

    describe('with --pdf option', () => {
      it('converts file with PDF type', async () => {
        const cmd = [onePath, '--pdf']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pdf)
      })
    })

    describe('with --pptx option', () => {
      it('converts file with PPTX type', async () => {
        const cmd = [onePath, '--pptx']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pptx)
      })
    })

    describe('with --image option', () => {
      it('converts file with PNG type by specified png', async () => {
        const cmd = [onePath, '--image', 'png']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.png)
      })

      it('converts file with PNG type if the type was not specified', async () => {
        const cmd = [onePath, '--image']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.png)
      })

      it('prints error if the specified type is not supported', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation()

        expect(await marpCli([onePath, '--image', 'unsupported'])).toBe(1)
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid values')
        )
      })

      it('converts file with JPEG type by specified jpeg', async () => {
        const cmd = [onePath, '--image=jpeg']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.jpeg)
      })

      it('converts file with JPEG type by specified jpg (alias to jpeg)', async () => {
        const cmd = ['--image', 'jpg', onePath]
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.jpeg)
      })

      describe('with --jpeg-quality option', () => {
        it('converts file with specified JPEG quality', async () => {
          const cmd = [onePath, '--image', 'jpg', '--jpeg-quality', '50']
          expect((await conversion(...cmd)).options.jpegQuality).toBe(50)
        })
      })
    })

    describe('with --images option', () => {
      it('converts file with PNG type and enabled pages option by specified png', async () => {
        const converter = await conversion(onePath, '--images', 'png')
        expect(converter.options.type).toBe(ConvertType.png)
        expect(converter.options.pages).toBe(true)
      })

      it('converts file with PNG type if the type was not specified', async () => {
        const converter = await conversion(onePath, '--images')
        expect(converter.options.type).toBe(ConvertType.png)
        expect(converter.options.pages).toBe(true)
      })

      it('converts file with JPEG type and enabled pages option by specified jpeg', async () => {
        const converter = await conversion(onePath, '--images=jpeg')
        expect(converter.options.type).toBe(ConvertType.jpeg)
        expect(converter.options.pages).toBe(true)
      })
    })

    describe('with --image-scale option', () => {
      const conf = assetFn('_configs/marpit/config.js')

      it('converts file with specified scale factor', async () => {
        expect(
          (await conversion(onePath, '--image-scale', '3')).options.imageScale
        ).toBe(3)
      })

      it('allows a decimal point number', async () => {
        jest
          .spyOn(Explorer.prototype, 'load')
          .mockResolvedValue({ filepath: conf, config: { imageScale: 0.5 } })

        expect(
          (await conversion(onePath, '--config', conf)).options.imageScale
        ).toBe(0.5)
      })

      it('restricts the scale factor up to x10', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation()

        expect(
          (await conversion(onePath, '--image-scale', '15')).options.imageScale
        ).toBe(10)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('restricted'))
      })

      it('cannot specify the scale factor to zero', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()

        expect(await marpCli([onePath, '--image-scale', '0'])).toBe(1)
        expect(cliError).toHaveBeenCalledWith(
          expect.stringContaining('cannot set as 0 or less')
        )
      })

      it('cannot specify the scale factor to the negative value', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()

        expect(await marpCli([onePath, '--image-scale', '-1'])).toBe(1)
        expect(cliError).toHaveBeenCalledWith(
          expect.stringContaining('cannot set as 0 or less')
        )
      })

      it('must be a number', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()

        jest
          .spyOn(Explorer.prototype, 'load')
          .mockResolvedValue({ filepath: conf, config: { imageScale: 'test' } })

        expect(await marpCli([onePath, '-c', conf])).toBe(1)
        expect(cliError).toHaveBeenCalledWith(
          expect.stringContaining('must be a number')
        )
      })
    })

    for (const opt of ['--parallel', '-P']) {
      describe(`with ${opt} option`, () => {
        it('converts files in parallel with specified concurrency', async () => {
          expect((await conversion(opt, '2', onePath)).options.parallel).toBe(2)
        })

        it('converts files in parallel with 5 concurrency if set as true', async () => {
          expect((await conversion(onePath, opt)).options.parallel).toBe(5)
        })

        it('converts files in serial if set as 1', async () => {
          expect((await conversion(opt, '1', onePath)).options.parallel).toBe(1)
        })

        it('converts files in serial if set invalid value', async () => {
          expect((await conversion(opt, '-1', onePath)).options.parallel).toBe(
            1
          )
        })
      })
    }

    describe('without parallel option', () => {
      it('converts files in parallel with 5 concurrency', async () => {
        expect((await conversion(onePath)).options.parallel).toBe(5)
      })
    })

    describe('with --no-parallel option', () => {
      it('converts files in serial', async () => {
        expect(
          (await conversion('--no-parallel', onePath)).options.parallel
        ).toBe(1)
      })
    })

    describe('with -o option', () => {
      it('converts file and output to stdout when -o is "-"', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()
        jest.spyOn(cli, 'info').mockImplementation()

        expect(await marpCli([onePath, '-o', '-'])).toBe(0)
        expect(stdout).toHaveBeenCalledTimes(1)
      })

      it('converts file with HTML type when extension is .html', async () => {
        // --pdf-notes is required to prefer PDF over HTML in the default type
        const cmd = [onePath, '--pdf-notes', '-o', 'example.html']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.html)
      })

      it('converts file with HTML type when extension is .htm', async () => {
        const cmd = [onePath, '--pdf-notes', '-o', 'example.htm']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.html)
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

    describe('with -w option', () => {
      it('starts watching by Watcher.watch()', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        jest.spyOn(fs.promises, 'writeFile').mockImplementation()

        await runForObservation([onePath, '-w'])
        expect(Watcher.watch).toHaveBeenCalledWith([onePath], expect.anything())
      })
    })

    describe('with configuration file', () => {
      it('uses configuration file found from process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/basic/'))

        expect(await marpCli(['md.md'])).toBe(0)

        const html = stdout.mock.calls[0][0].toString()
        expect(html).toContain('<b>html<button>button</button></b>')
      })

      it('prevents looking up for configuration file if --no-config-file option is passed', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/basic/'))

        for (const opt of ['--no-config-file', '--no-config']) {
          stdout.mockClear()

          expect(await marpCli(['md.md', opt, '-o', '-'])).toBe(0)

          // html option in a configuration file should not work, and not allowed element should be escaped
          const html = stdout.mock.calls[0][0].toString()
          expect(html).toContain(
            '<b>html&lt;button&gt;button&lt;/button&gt;</b>'
          )
        }
      })

      it('uses marp section in package.json that is found in process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        jest.spyOn(console, 'warn').mockImplementation()
        jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/package-json/'))

        expect(await marpCli(['md.md', '-o', '-'])).toBe(0)

        const html = stdout.mock.calls[0][0].toString()
        expect(html).toContain('--theme-b')
      })

      describe('when --config-file / --config / -c option is passed', () => {
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
          expect(await marpCli(['--config', conf, onePath, '-o', '-'])).toBe(0)

          const html = stdout.mock.calls[0][0].toString()
          expect(html).toContain('--theme-a')
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
          const { engine } = require(conf) // eslint-disable-line @typescript-eslint/no-require-imports

          expect(await marpCli(['-c', conf, md, '--no-output'])).toBe(0)
          expect(engine).toHaveBeenCalledWith(
            expect.objectContaining({ customOption: true })
          )
        })
      })

      describe('with ES Module', () => {
        it('allows loading config with mjs extension', async () => {
          const debug = jest.spyOn(console, 'debug').mockImplementation()

          jest.spyOn(console, 'log').mockImplementation()

          expect(
            await marpCli(['-v', '-c', assetFn('_configs/mjs/config.mjs')])
          ).toBe(0)

          expect(debug).toHaveBeenCalledWith(expect.stringContaining('loaded'))
        })

        it('allows loading config from ESM project', async () => {
          const debug = jest.spyOn(console, 'debug').mockImplementation()

          jest.spyOn(console, 'log').mockImplementation()

          expect(
            await marpCli([
              '-v',
              '-c',
              assetFn('_configs/esm-project/marp.config.js'),
            ])
          ).toBe(0)

          expect(debug).toHaveBeenCalledWith(expect.stringContaining('loaded'))
        })
      })

      describe('with TypeScript', () => {
        it('allows loading config with TypeScript', async () => {
          const debug = jest.spyOn(console, 'debug').mockImplementation()

          jest.spyOn(console, 'log').mockImplementation()

          expect(
            await marpCli([
              '-v',
              '-c',
              assetFn('_configs/typescript/marp.config.ts'),
            ])
          ).toBe(0)

          expect(debug).toHaveBeenCalledWith(expect.stringContaining('loaded'))
        })
      })
    })

    describe('with --preview / -p option', () => {
      let warn: jest.SpyInstance<ReturnType<Console['warn']>, any>

      beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation()
      })

      it('opens preview window through Preview.open()', async () => {
        await runForObservation([onePath, '-p', '--no-output'])
        expect(Preview.prototype.open).toHaveBeenCalledTimes(1)

        // Simualte opening event
        previewEmitter.emit('opening', '<location>')
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('Opening <location>')
        )
      })

      describe('when PPTX conversion is enabled', () => {
        it('does not open PPTX in preview window', async () => {
          await runForObservation([onePath, '-p', '--pptx', '--no-output'])
          expect(Preview.prototype.open).not.toHaveBeenCalled()
        }, 60000)
      })

      describe('when CLI is running in an official Docker image', () => {
        it('ignores --preview option with warning', async () => {
          jest
            .spyOn(container, 'isOfficialContainerImage')
            .mockReturnValue(true)

          await marpCli([onePath, '--preview', '--no-output'])

          expect(Preview.prototype.open).not.toHaveBeenCalled()
          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Preview option was ignored')
          )
        })
      })
    })

    describe('with --pdf-notes options', () => {
      it('prefers PDF than HTML if not specified conversion type', async () => {
        const cmd = [onePath, '--pdf-notes']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pdf)

        // This option is actually not for defining conversion type so other
        // options to set conversion type are always prioritized.
        const cmdPptx = [onePath, '--pdf-notes', '--pptx']
        expect((await conversion(...cmdPptx)).options.type).toBe(
          ConvertType.pptx
        )
      })
    })

    describe('with --pdf-outlines options', () => {
      it('converts PDF with outlines for pages and headings', async () => {
        const converter = await conversion(onePath, '--pdf-outlines')
        expect(converter.options.type).toBe(ConvertType.pdf)
        expect(converter.options.pdfOutlines).toStrictEqual({
          pages: true,
          headings: true,
        })
      })

      it('prefers PDF than HTML if not specified conversion type', async () => {
        const converter = await conversion(onePath, '--pdf-outlines', '--pptx')
        expect(converter.options.type).toBe(ConvertType.pptx)
      })

      describe('as false', () => {
        it('converts PDF without outlines when pdf option is enabled', async () => {
          const cmd = [onePath, '--pdf', '--pdf-outlines=false']
          const converter = await conversion(...cmd)
          expect(converter.options.type).toBe(ConvertType.pdf)
          expect(converter.options.pdfOutlines).toBe(false)

          // Negative option
          const negativeCmd = [onePath, '--pdf', '--no-pdf-outlines']
          const converterNegativeCmd = await conversion(...negativeCmd)
          expect(converterNegativeCmd.options.type).toBe(ConvertType.pdf)
          expect(converterNegativeCmd.options.pdfOutlines).toBe(false)

          // With detailed options
          const converterDetailed = await conversion(
            onePath,
            '--pdf',
            '--pdf-outlines',
            'false',
            '--pdf-outline.pages',
            '--pdf-outline.headings'
          )
          expect(converterDetailed.options.type).toBe(ConvertType.pdf)
          expect(converterDetailed.options.pdfOutlines).toBe(false)
        })
      })

      describe('with --pdf-outlines.pages as false', () => {
        it('converts PDF with outlines only for headings', async () => {
          const converter = await conversion(
            onePath,
            '--pdf-outlines',
            '--pdf-outlines.pages=false'
          )
          expect(converter.options.type).toBe(ConvertType.pdf)
          expect(converter.options.pdfOutlines).toStrictEqual({
            pages: false,
            headings: true,
          })
        })
      })

      describe('with --pdf-outlines.headings as false', () => {
        it('converts PDF with outlines only for pages', async () => {
          const converter = await conversion(
            onePath,
            '--pdf-outlines.headings',
            'false',
            '--pdf-outlines'
          )
          expect(converter.options.type).toBe(ConvertType.pdf)
          expect(converter.options.pdfOutlines).toStrictEqual({
            pages: true,
            headings: false,
          })
        })
      })

      describe('with all detailed options as false', () => {
        it('converts PDF without outlines when pdf option is enabled', async () => {
          const converter = await conversion(
            onePath,
            '--pdf',
            '--pdf-outlines.pages=false',
            '--pdf-outlines.headings=false',
            '--pdf-outlines'
          )
          expect(converter.options.type).toBe(ConvertType.pdf)
          expect(converter.options.pdfOutlines).toBe(false)
        })
      })
    })

    describe('with --pptx-editable options', () => {
      it('prefers PPTX than HTML if not specified conversion type', async () => {
        const cmd = [onePath, '--pptx-editable']
        expect((await conversion(...cmd)).options.type).toBe(ConvertType.pptx)

        // This option is actually not for defining conversion type so other
        // options to set conversion type are always prioritized.
        const cmdPptx = [onePath, '--pptx-editable', '--pdf']
        expect((await conversion(...cmdPptx)).options.type).toBe(
          ConvertType.pdf
        )
      })
    })

    describe('with PUPPETEER_TIMEOUT env', () => {
      beforeEach(() => {
        process.env.PUPPETEER_TIMEOUT = '12345'
      })

      afterEach(() => {
        delete process.env.PUPPETEER_TIMEOUT
      })

      it('follows specified timeout in conversion that is using Puppeteer', async () => {
        expect(
          (await conversion(onePath, '--pdf')).options.browserManager.timeout
        ).toBe(12345)
      })

      it('does not follows specified timeout if the env value is not valid number', async () => {
        process.env.PUPPETEER_TIMEOUT = 'invalid'

        expect(
          (await conversion(onePath, '--pdf')).options.browserManager.timeout
        ).toBeUndefined()
      })

      it('ignores if --browser-timeout option is specified', async () => {
        expect(
          (await conversion(onePath, '--pdf', '--browser-timeout', '56789ms'))
            .options.browserManager.timeout
        ).toBe(56789)
      })
    })

    describe('with BROWSER_PATH env', () => {
      beforeEach(() => {
        process.env.BROWSER_PATH = '/path/to/browser'
      })

      afterEach(() => {
        delete process.env.BROWSER_PATH
      })

      it('uses specified path as the preferred path of finder', async () => {
        expect(
          (await conversion(onePath, '--pdf')).options.browserManager[
            '_finderPreferredPath'
          ]
        ).toBe('/path/to/browser')
      })

      it('ignores if --browser-path option is specified', async () => {
        expect(
          (
            await conversion(
              onePath,
              '--pdf',
              '--browser-path',
              '/preferred/path/to/browser'
            )
          ).options.browserManager['_finderPreferredPath']
        ).toBe(path.resolve('/preferred/path/to/browser'))
      })
    })
  })

  describe('with passing directory', () => {
    it('finds out markdown files recursively', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      jest
        .spyOn<any, any>(Converter.prototype, 'convertFiles')
        .mockImplementation(() => [])

      expect(await marpCli([assetFn('_files')])).toBe(0)
      expect(cliInfo.mock.calls.map(([m]) => m)).toContainEqual(
        expect.stringContaining('6 markdowns')
      )
    })

    describe('when glob special chars are included in real file path', () => {
      it('finds out a file correctly', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        expect(await marpCli([assetFn('_files/字/(non-ascii).md')])).toBe(0)
      })
    })

    describe('when non-ASCII code is included in directory name', () => {
      it('finds out markdown files correctly', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        expect(await marpCli([assetFn('_files/字')])).toBe(0)
      })
    })

    describe('when glob special chars are included in real directory path', () => {
      it('finds out markdown files in specified directory correctly', async () => {
        jest.spyOn(cli, 'info').mockImplementation()
        jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        expect(await marpCli([assetFn('_files/(sp)')])).toBe(0)
      })
    })

    describe('with --server option', () => {
      it('treats passed directory as an input directory of the server', async () => {
        jest.spyOn(cli, 'info').mockImplementation()

        const serverStart = jest
          .spyOn<any, any>(Server.prototype, 'start')
          .mockResolvedValue(0)

        await runForObservation(['--server', assetFn('_files')])
        expect(serverStart).toHaveBeenCalledTimes(1)

        const server: any = serverStart.mock.instances[0]
        const converter: Converter = server.converter

        expect(converter.options.inputDir).toBe(assetFn('_files'))
      })

      describe('with --preview option', () => {
        it('opens served address through Preview.open()', async () => {
          jest.spyOn(console, 'warn').mockImplementation()

          await runForObservation(['--server', assetFn('_files'), '--preview'])
          expect(Preview.prototype.open).toHaveBeenCalledTimes(1)
          expect(Preview.prototype.open).toHaveBeenCalledWith(
            expect.stringMatching(/^http:\/\/localhost:/)
          )
        })
      })
    })
  })

  describe('with passing multiple files', () => {
    const baseArgs = [assetFn('_files/1.md'), assetFn('_files/2.mdown')]

    describe('with --server option', () => {
      it('prints error and return error code', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation()

        expect(await marpCli([...baseArgs, '--server'])).toBe(1)
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining('specify just one directory')
        )
      })
    })

    describe('with --preview option', () => {
      it('opens 2 preview windows through Preview.open()', async () => {
        jest.spyOn(console, 'warn').mockImplementation()

        await runForObservation([...baseArgs, '--preview', '--no-output'])
        expect(Preview.prototype.open).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('with passing from stdin', () => {
    let cliInfo: jest.SpyInstance
    let stdout: jest.SpyInstance

    beforeEach(() => {
      cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      jest.spyOn(stdin, 'getStdin').mockResolvedValue(Buffer.from('# markdown'))

      // reset cached stdin buffer
      ;(File as any).stdinBuffer = undefined
    })

    it('converts markdown came from stdin and outputs to stdout', async () => {
      expect(await marpCli([])).toBe(0)
      expect(cliInfo.mock.calls.map(([m]) => m)).toContainEqual(
        expect.stringContaining('<stdin> => <stdout>')
      )
      expect(stdout).toHaveBeenCalledWith(expect.any(Buffer))
    })

    describe('with --stdin option as false', () => {
      it('does not convert stdin even if passed', async () => {
        jest.spyOn(console, 'log').mockImplementation()

        expect(await marpCli(['--stdin=false'])).toBe(0)
        expect(cliInfo.mock.calls.map(([m]) => m)).not.toContainEqual(
          expect.stringContaining('<stdin> => <stdout>')
        )
        expect(stdout).not.toHaveBeenCalledWith(expect.any(Buffer))
      })
    })
  })
})

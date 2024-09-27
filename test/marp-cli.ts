import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { version as coreVersion } from '@marp-team/marp-core/package.json'
import { version as marpitVersion } from '@marp-team/marpit/package.json'
import * as cosmiconfigExplorer from 'cosmiconfig/dist/Explorer' // eslint-disable-line import-x/namespace
import getStdin from 'get-stdin'
import stripAnsi from 'strip-ansi'
import { version as cliVersion } from '../package.json'
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
import * as version from '../src/version'
import { Watcher } from '../src/watcher'

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

jest.mock('node:fs', () => require('./__mocks__/node/fs')) // eslint-disable-line @typescript-eslint/no-require-imports, jest/no-mocks-import -- Windows file system cannot use `:`
jest.mock('cosmiconfig')
jest.mock('../src/preview')
jest.mock('../src/watcher', () => jest.createMockFromModule('../src/watcher'))

let previewEmitterOn: jest.SpyInstance

beforeEach(() => {
  previewEmitter.removeAllListeners()

  previewEmitterOn = jest
    .spyOn(Preview.prototype, 'on')
    .mockImplementation((e, func) => previewEmitter.on(e, func))
})

afterEach(() => {
  let observationHelper: ObservationHelper | undefined

  while ((observationHelper = observationHelpers.shift())) {
    observationHelper.stop()
  }

  previewEmitterOn?.mockRestore()

  jest.clearAllMocks()
})

describe('Marp CLI', () => {
  const assetFn = (fn) => path.resolve(__dirname, fn)

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

      afterEach(() => {
        log.mockRestore()
        findClassPath.mockRestore()
      })

      const mockEnginePath = (path) =>
        findClassPath.mockImplementation(() => path)

      it('outputs package versions about cli and bundled core', async () => {
        // isMarpCore does not return correct result in Windows environment
        const isMarpCoreSpy = jest
          .spyOn(version, 'isMarpCore')
          .mockResolvedValue(true)

        try {
          expect(await marpCli([cmd])).toBe(0)
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining(`@marp-team/marp-cli v${cliVersion}`)
          )
          expect(log).toHaveBeenCalledWith(
            expect.stringContaining(`@marp-team/marp-core v${coreVersion}`)
          )
        } finally {
          isMarpCoreSpy.mockRestore()
        }
      })

      describe('when resolved core has unexpected version against bundled', () => {
        const pkgJson = { name: '@marp-team/marp-core', version: '0.0.0' }
        const pkgPath = '../node_modules/@marp-team/marp-core/package.json'

        let isMarpCoreSpy: jest.SpyInstance

        beforeEach(() => {
          isMarpCoreSpy = jest
            .spyOn(version, 'isMarpCore')
            .mockResolvedValue(true)

          mockEnginePath(
            assetFn('../node_modules/@marp-team/marp-core/lib/marp.js')
          )

          jest.doMock(pkgPath, () => pkgJson)
        })

        afterEach(() => {
          jest.unmock(pkgPath)

          isMarpCoreSpy?.mockRestore()
        })

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

      afterEach(() => {
        log?.mockRestore()
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
            const isOfficialImage = jest
              .spyOn(container, 'isOfficialDockerImage')
              .mockReturnValue(true)

            try {
              expect(await run()).toBe(0)
              expect(log).toHaveBeenCalledWith(
                expect.not.stringContaining('--preview')
              )
            } finally {
              isOfficialImage.mockRestore()
            }
          })
        })
      })
    })
  }

  describe('when passed file is not found', () => {
    it('outputs warning and help with exit code 1', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation()
      const error = jest.spyOn(console, 'error').mockImplementation()

      try {
        expect(await marpCli(['_NOT_FOUND_FILE_'])).toBe(1)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Not found'))
        expect(error).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      } finally {
        warn.mockRestore()
        error.mockRestore()
      }
    })
  })

  describe('with --engine option', () => {
    it('allows loading custom engine with ES modules', async () => {
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()
      const warn = jest.spyOn(console, 'warn').mockImplementation()

      const cmds = [
        '--engine',
        assetFn('_configs/custom-engine/custom-engine.mjs'),
        '-o',
        '-',
        assetFn('_files/1.md'),
      ]

      const log = jest.spyOn(console, 'log').mockImplementation()

      try {
        expect(await marpCli(cmds)).toBe(0)

        const html = stdout.mock.calls[0][0].toString()
        expect(html).toContain('<b>custom</b>')
      } finally {
        stdout.mockRestore()
        log.mockRestore()
        warn.mockRestore()
      }
    })

    it('prints error and return error code when passed module is invalid', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation()

      try {
        expect(await marpCli(['--engine', '@marp-team/invalid'])).toBe(1)
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining('The specified engine has not resolved.')
        )
      } finally {
        error.mockRestore()
      }
    })

    it('uses require() instead of import() to resolve engine when ESM is not available in this context', async () => {
      const isESMAvailable = jest
        .spyOn(ResolvedEngine, 'isESMAvailable')
        .mockReturnValue(false)

      try {
        const log = jest.spyOn(console, 'log').mockImplementation()

        try {
          const silentImportSpy = jest.spyOn(
            ResolvedEngine as any,
            '_silentImport'
          )
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
        } finally {
          log.mockRestore()
        }
      } finally {
        isESMAvailable.mockRestore()
      }
    })
  })

  describe('with --input-dir option', () => {
    const files = assetFn('_files')

    let writeFile: jest.Mock
    beforeEach(() => (writeFile = (fs as any).__mockWriteFile()))

    it('converts files in specified dir', async () => {
      const info = jest.spyOn(cli, 'info').mockImplementation()

      try {
        expect(await marpCli(['--input-dir', files])).toBe(0)
        expect(writeFile).toHaveBeenCalledTimes(6)
        writeFile.mock.calls.forEach(([fn]) => expect(fn).toMatch(/\.html$/))
      } finally {
        info.mockRestore()
      }
    })

    it('allows using theme css in specified dir', async () => {
      const info = jest.spyOn(cli, 'info').mockImplementation()

      try {
        expect(await marpCli(['--input-dir', files, '--theme', 'a'])).toBe(0)

        for (const [, buffer] of writeFile.mock.calls) {
          expect(buffer.toString()).toContain('--theme-a')
        }
      } finally {
        info.mockRestore()
      }
    })

    it('prints error and return error code with invalid option(s)', async () => {
      const err = jest.spyOn(console, 'error').mockImplementation()
      const warn = jest.spyOn(console, 'warn').mockImplementation()

      try {
        // Pass file path, not folder
        expect(await marpCli(['--input-dir', assetFn('_files/1.md')])).toBe(1)
        expect(err).toHaveBeenCalledWith(
          expect.stringContaining('is not directory.')
        )

        // Pass not found path
        err.mockClear()
        expect(await marpCli(['--input-dir', assetFn('__NOT_FOUND__')])).toBe(1)
        expect(err).toHaveBeenCalledWith(
          expect.stringContaining('is not found.')
        )

        // Pass together with regular input files
        err.mockClear()
        expect(await marpCli(['test.md', '--input-dir', files])).toBe(1)
        expect(err).toHaveBeenCalledWith(
          expect.stringContaining(
            'Cannot pass files together with input directory'
          )
        )
      } finally {
        err.mockRestore()
        warn.mockRestore()
      }
    })

    describe('when the directory path has included glob pattern', () => {
      it('converts files in specified dir', async () => {
        const info = jest.spyOn(cli, 'info').mockImplementation()

        try {
          expect(await marpCli(['--input-dir', assetFn('_files/(sp)')])).toBe(0)
          expect(writeFile).toHaveBeenCalledTimes(1)
        } finally {
          info.mockRestore()
        }
      })
    })

    describe('when the output folder is specified by -o option', () => {
      it('converts markdowns with keeping folder structure', async () => {
        const args = ['--input-dir', files, '-o', assetFn('dist')]

        const info = jest.spyOn(cli, 'info').mockImplementation()

        try {
          expect(await marpCli(args)).toBe(0)
          expect(writeFile).toHaveBeenCalledTimes(6)

          const outputFiles = writeFile.mock.calls.map(([fn]) => fn)
          expect(outputFiles).toContain(assetFn('dist/1.html'))
          expect(outputFiles).toContain(assetFn('dist/2.html'))
          expect(outputFiles).toContain(assetFn('dist/3.html'))
          expect(outputFiles).toContain(assetFn('dist/subfolder/5.html'))
        } finally {
          info.mockRestore()
        }
      })
    })

    describe('with --server option', () => {
      it('starts listening server and watcher for passed directory', async () => {
        const info = jest.spyOn(cli, 'info')
        info.mockImplementation()

        const serverStart = jest.spyOn<any, any>(Server.prototype, 'start')
        serverStart.mockResolvedValue(0)

        try {
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
        } finally {
          info.mockRestore()
          serverStart.mockRestore()
        }
      })

      describe('with --preview option', () => {
        const run = () =>
          runForObservation(['--input-dir', files, '--server', '--preview'])

        let infoSpy: jest.SpyInstance
        let serverStartSpy: jest.SpyInstance

        beforeEach(() => {
          infoSpy = jest.spyOn(cli, 'info').mockImplementation()
          serverStartSpy = jest
            .spyOn<any, any>(Server.prototype, 'start')
            .mockResolvedValue(0)
        })

        afterEach(() => {
          infoSpy?.mockRestore()
          serverStartSpy?.mockRestore()
        })

        it('opens preview window through Preview.open()', async () => {
          await run()
          expect(Preview.prototype.open).toHaveBeenCalledTimes(1)
        })

        describe('when CLI is running in an official Docker image', () => {
          it('ignores --preview option with warning', async () => {
            const isOfficialImage = jest
              .spyOn(container, 'isOfficialDockerImage')
              .mockReturnValue(true)
            const warn = jest.spyOn(cli, 'warn').mockImplementation()

            try {
              await run()
              expect(Preview.prototype.open).not.toHaveBeenCalled()
              expect(warn.mock.calls.map(([m]) => m)).toContainEqual(
                expect.stringContaining('Preview option was ignored')
              )
            } finally {
              isOfficialImage.mockRestore()
              warn.mockRestore()
            }
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
        const warn = jest.spyOn(console, 'warn').mockImplementation()

        try {
          expect(await marpCli(['-c', confFile])).toBe(0)
          expect(findDir).toHaveBeenCalledWith(slides)
          expect(writeFile).toHaveBeenCalledWith(
            distHtml,
            expect.any(Buffer),
            expect.anything()
          )
        } finally {
          findDir.mockRestore()
          warn.mockRestore()
        }
      })
    })
  })

  describe('with --theme option', () => {
    let convert: jest.MockInstance<any, any>
    let info: jest.MockInstance<any, any>

    beforeEach(() => {
      convert = jest.spyOn(Converter.prototype, 'convert')
      info = jest.spyOn(cli, 'info')

      info.mockImplementation()
      ;(fs as any).__mockWriteFile()
    })

    afterEach(() => {
      info.mockRestore()
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

        try {
          const args = [assetFn('_files/1.md'), '--theme', themesPath]

          expect(await marpCli(args)).toBe(1)
          expect(cliError.mock.calls.map(([m]) => m)).toContainEqual(
            expect.stringContaining('Directory cannot pass to theme option')
          )
          expect(info).toHaveBeenCalledTimes(1)

          const advice = stripAnsi(info.mock.calls[0][0])
          expect(advice).toContain('use --theme-set option')
        } finally {
          cliError.mockRestore()
        }
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
    let infoSpy: jest.MockInstance<any, any>

    beforeEach(() => {
      convert = jest.spyOn(Converter.prototype, 'convert')
      observeSpy = jest.spyOn(ThemeSet.prototype, 'observe')

      infoSpy = jest.spyOn(cli, 'info').mockImplementation()
      ;(fs as any).__mockWriteFile()
    })

    afterEach(() => {
      infoSpy?.mockRestore()
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

          try {
            expect(await marpCli(baseArgs(dir))).toBe(0)
            expect(convert).toHaveBeenCalledTimes(1)
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining('Not found additional theme CSS files')
            )
          } finally {
            warn.mockRestore()
          }
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

      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      try {
        await marpCli(cmd)
        expect(cvtFiles).toHaveBeenCalled()

        return cvtFiles.mock.instances[0] as any
      } finally {
        cvtFiles.mockRestore()
        cliInfo.mockRestore()
      }
    }

    it('converts file', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

      try {
        ;(fs as any).__mockWriteFile()

        expect(await marpCli([onePath])).toBe(0)

        const logs = cliInfo.mock.calls.map(([m]) => m)
        expect(logs).toContainEqual(expect.stringContaining('1 markdown'))
        expect(logs).toContainEqual(expect.stringMatching(/1\.md => .+1\.html/))
      } finally {
        cliInfo.mockRestore()
      }
    })

    it('prints error and return error code when CLIError is raised', async () => {
      const cliError = jest.spyOn(cli, 'error').mockImplementation()
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      const cvtFiles = jest
        .spyOn(Converter.prototype, 'convertFiles')
        .mockImplementation(() => Promise.reject(new CLIError('FAIL', 123)))

      try {
        expect(await marpCli([onePath])).toBe(123)
        expect(cliError.mock.calls.map(([m]) => m)).toContainEqual(
          expect.stringContaining('FAIL')
        )
      } finally {
        cvtFiles.mockRestore()
        cliError.mockRestore()
        cliInfo.mockRestore()
      }
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
        const cmd = [onePath, '--image-scale', '3']
        expect((await conversion(...cmd)).options.imageScale).toBe(3)
      })

      it('allows a decimal point number', async () => {
        const load = jest
          .spyOn(Explorer.prototype, 'load')
          .mockResolvedValue({ filepath: conf, config: { imageScale: 0.5 } })

        try {
          const cmd = [onePath, '--config', conf]
          expect((await conversion(...cmd)).options.imageScale).toBe(0.5)
        } finally {
          load.mockRestore()
        }
      })

      it('restricts the scale factor up to x10', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation()

        try {
          const cmd = [onePath, '--image-scale', '15']

          expect((await conversion(...cmd)).options.imageScale).toBe(10)
          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('restricted')
          )
        } finally {
          warn.mockRestore()
        }
      })

      it('cannot specify the scale factor to zero', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()

        try {
          const cmd = [onePath, '--image-scale', '0']

          expect(await marpCli(cmd)).toBe(1)
          expect(cliError).toHaveBeenCalledWith(
            expect.stringContaining('cannot set as 0 or less')
          )
        } finally {
          cliError.mockRestore()
        }
      })

      it('cannot specify the scale factor to the negative value', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()

        try {
          const cmd = [onePath, '--image-scale', '-1']

          expect(await marpCli(cmd)).toBe(1)
          expect(cliError).toHaveBeenCalledWith(
            expect.stringContaining('cannot set as 0 or less')
          )
        } finally {
          cliError.mockRestore()
        }
      })

      it('must be a number', async () => {
        const cliError = jest.spyOn(cli, 'error').mockImplementation()
        const load = jest
          .spyOn(Explorer.prototype, 'load')
          .mockResolvedValue({ filepath: conf, config: { imageScale: 'test' } })

        try {
          expect(await marpCli([onePath, '-c', conf])).toBe(1)
          expect(cliError).toHaveBeenCalledWith(
            expect.stringContaining('must be a number')
          )
        } finally {
          cliError.mockRestore()
          load.mockRestore()
        }
      })
    })

    describe('with -o option', () => {
      it('converts file and output to stdout when -o is "-"', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()
        const info = jest.spyOn(cli, 'info').mockImplementation()

        try {
          expect(await marpCli([onePath, '-o', '-'])).toBe(0)
          expect(stdout).toHaveBeenCalledTimes(1)
        } finally {
          stdout.mockRestore()
          info.mockRestore()
        }
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
        const info = jest.spyOn(cli, 'info').mockImplementation()

        try {
          ;(fs as any).__mockWriteFile()

          await runForObservation([onePath, '-w'])
          expect(Watcher.watch).toHaveBeenCalledWith(
            [onePath],
            expect.anything()
          )
        } finally {
          info.mockRestore()
        }
      })
    })

    describe('with configuration file', () => {
      it('uses configuration file found from process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        const warn = jest.spyOn(console, 'warn').mockImplementation()
        const cwd = jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/basic/'))

        try {
          expect(await marpCli(['md.md'])).toBe(0)

          const html = stdout.mock.calls[0][0].toString()
          expect(html).toContain('<b>html<button>button</button></b>')
        } finally {
          stdout.mockRestore()
          warn.mockRestore()
          cwd.mockRestore()
        }
      })

      it('prevents looking up for configuration file if --no-config-file option is passed', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        const warn = jest.spyOn(console, 'warn').mockImplementation()
        const cwd = jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/basic/'))

        try {
          for (const opt of ['--no-config-file', '--no-config']) {
            stdout.mockClear()

            expect(await marpCli(['md.md', opt, '-o', '-'])).toBe(0)

            // html option in a configuration file should not work, and not allowed element should be escaped
            const html = stdout.mock.calls[0][0].toString()
            expect(html).toContain(
              '<b>html&lt;button&gt;button&lt;/button&gt;</b>'
            )
          }
        } finally {
          stdout.mockRestore()
          warn.mockRestore()
          cwd.mockRestore()
        }
      })

      it('uses marp section in package.json that is found in process.cwd()', async () => {
        const stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

        const warn = jest.spyOn(console, 'warn').mockImplementation()
        const cwd = jest
          .spyOn(process, 'cwd')
          .mockImplementation(() => assetFn('_configs/package-json/'))

        try {
          expect(await marpCli(['md.md', '-o', '-'])).toBe(0)

          const html = stdout.mock.calls[0][0].toString()
          expect(html).toContain('--theme-b')
        } finally {
          stdout.mockRestore()
          warn.mockRestore()
          cwd.mockRestore()
        }
      })

      describe('when --config-file / --config / -c option is passed', () => {
        it('prints error when specified config is not found', async () => {
          const error = jest.spyOn(console, 'error').mockImplementation()

          try {
            expect(await marpCli(['--config-file', '_NOT_FOUND_FILE_'])).toBe(1)
            expect(error).toHaveBeenCalledTimes(1)
            expect(error).toHaveBeenCalledWith(
              expect.stringContaining('_NOT_FOUND_FILE_')
            )
            expect(error).toHaveBeenCalledWith(
              expect.stringContaining('Could not find or parse configuration')
            )
          } finally {
            error.mockRestore()
          }
        })

        it('applies specified config', async () => {
          const stdout = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation()

          const warn = jest.spyOn(console, 'warn').mockImplementation()

          try {
            const conf = assetFn('_configs/marpit/config.js')
            expect(await marpCli(['--config', conf, onePath, '-o', '-'])).toBe(
              0
            )

            const html = stdout.mock.calls[0][0].toString()
            expect(html).toContain('--theme-a')
          } finally {
            stdout.mockRestore()
            warn.mockRestore()
          }
        })

        it('allows custom engine class specified in js config', async () => {
          const stdout = jest
            .spyOn(process.stdout, 'write')
            .mockImplementation()

          const warn = jest.spyOn(console, 'warn').mockImplementation()
          const cwd = jest
            .spyOn(process, 'cwd')
            .mockImplementation(() => assetFn('_configs/custom-engine/'))

          try {
            expect(await marpCli(['md.md', '-o', '-'])).toBe(0)

            const html = stdout.mock.calls[0][0].toString()
            expect(html).toContain('<b>custom</b>')
            expect(html).toContain('/* custom */')
          } finally {
            stdout.mockRestore()
            warn.mockRestore()
            cwd.mockRestore()
          }
        })

        it('allows custom engine function specified in js config', async () => {
          const warn = jest.spyOn(console, 'warn').mockImplementation()

          try {
            const conf = assetFn('_configs/custom-engine/anonymous.js')
            const md = assetFn('_configs/custom-engine/md.md')
            const { engine } = require(conf) // eslint-disable-line @typescript-eslint/no-require-imports

            expect(await marpCli(['-c', conf, md, '--no-output'])).toBe(0)
            expect(engine).toHaveBeenCalledWith(
              expect.objectContaining({ customOption: true })
            )
          } finally {
            warn.mockRestore()
          }
        })
      })

      describe('with ES Module', () => {
        it('allows loading config with mjs extension', async () => {
          const debug = jest.spyOn(console, 'debug').mockImplementation()
          const log = jest.spyOn(console, 'log').mockImplementation()

          try {
            expect(
              await marpCli(['-v', '-c', assetFn('_configs/mjs/config.mjs')])
            ).toBe(0)

            expect(debug).toHaveBeenCalledWith(
              expect.stringContaining('loaded')
            )
          } finally {
            debug.mockRestore()
            log.mockRestore()
          }
        })

        it('allows loading config from ESM project', async () => {
          const debug = jest.spyOn(console, 'debug').mockImplementation()
          const log = jest.spyOn(console, 'log').mockImplementation()

          try {
            expect(
              await marpCli([
                '-v',
                '-c',
                assetFn('_configs/esm-project/marp.config.js'),
              ])
            ).toBe(0)

            expect(debug).toHaveBeenCalledWith(
              expect.stringContaining('loaded')
            )
          } finally {
            debug.mockRestore()
            log.mockRestore()
          }
        })
      })

      describe('with TypeScript', () => {
        it('allows loading config with TypeScript', async () => {
          const debug = jest.spyOn(console, 'debug').mockImplementation()
          const log = jest.spyOn(console, 'log').mockImplementation()

          try {
            expect(
              await marpCli([
                '-v',
                '-c',
                assetFn('_configs/typescript/marp.config.ts'),
              ])
            ).toBe(0)

            expect(debug).toHaveBeenCalledWith(
              expect.stringContaining('loaded')
            )
          } finally {
            debug.mockRestore()
            log.mockRestore()
          }
        })
      })
    })

    describe('with --preview / -p option', () => {
      let warn: jest.SpyInstance<ReturnType<Console['warn']>, any>

      beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation()
      })

      afterEach(() => {
        warn.mockRestore()
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
          const isOfficialImage = jest
            .spyOn(container, 'isOfficialDockerImage')
            .mockReturnValue(true)

          try {
            await marpCli([onePath, '--preview', '--no-output'])

            expect(Preview.prototype.open).not.toHaveBeenCalled()
            expect(warn).toHaveBeenCalledWith(
              expect.stringContaining('Preview option was ignored')
            )
          } finally {
            isOfficialImage.mockRestore()
          }
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
    })
  })

  describe('with passing directory', () => {
    it('finds out markdown files recursively', async () => {
      const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      const cvtFiles = jest
        .spyOn<any, any>(Converter.prototype, 'convertFiles')
        .mockImplementation(() => [])

      try {
        expect(await marpCli([assetFn('_files')])).toBe(0)
        expect(cliInfo.mock.calls.map(([m]) => m)).toContainEqual(
          expect.stringContaining('6 markdowns')
        )
      } finally {
        cliInfo.mockRestore()
        cvtFiles.mockRestore()
      }
    })

    describe('when glob special chars are included in real file path', () => {
      it('finds out a file correctly', async () => {
        const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
        const cvtFiles = jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        try {
          expect(await marpCli([assetFn('_files/字/(non-ascii).md')])).toBe(0)
        } finally {
          cliInfo.mockRestore()
          cvtFiles.mockRestore()
        }
      })
    })

    describe('when non-ASCII code is included in directory name', () => {
      it('finds out markdown files correctly', async () => {
        const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
        const cvtFiles = jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        try {
          expect(await marpCli([assetFn('_files/字')])).toBe(0)
        } finally {
          cliInfo.mockRestore()
          cvtFiles.mockRestore()
        }
      })
    })

    describe('when glob special chars are included in real directory path', () => {
      it('finds out markdown files in specified directory correctly', async () => {
        const cliInfo = jest.spyOn(cli, 'info').mockImplementation()
        const cvtFiles = jest
          .spyOn<any, any>(Converter.prototype, 'convertFiles')
          .mockImplementation(() => [])

        try {
          expect(await marpCli([assetFn('_files/(sp)')])).toBe(0)
        } finally {
          cliInfo.mockRestore()
          cvtFiles.mockRestore()
        }
      })
    })

    describe('with --server option', () => {
      it('treats passed directory as an input directory of the server', async () => {
        const cliInfo = jest.spyOn(cli, 'info').mockImplementation()

        const serverStart = jest.spyOn<any, any>(Server.prototype, 'start')
        serverStart.mockResolvedValue(0)

        try {
          await runForObservation(['--server', assetFn('_files')])
          expect(serverStart).toHaveBeenCalledTimes(1)

          const server: any = serverStart.mock.instances[0]
          const converter: Converter = server.converter

          expect(converter.options.inputDir).toBe(assetFn('_files'))
        } finally {
          cliInfo.mockRestore()
          serverStart.mockRestore()
        }
      })

      describe('with --preview option', () => {
        it('opens served address through Preview.open()', async () => {
          const warn = jest.spyOn(console, 'warn').mockImplementation()

          try {
            await runForObservation([
              '--server',
              assetFn('_files'),
              '--preview',
            ])
            expect(Preview.prototype.open).toHaveBeenCalledTimes(1)
            expect(Preview.prototype.open).toHaveBeenCalledWith(
              expect.stringMatching(/^http:\/\/localhost:/)
            )
          } finally {
            warn.mockRestore()
          }
        })
      })
    })
  })

  describe('with passing multiple files', () => {
    const baseArgs = [assetFn('_files/1.md'), assetFn('_files/2.mdown')]

    describe('with --server option', () => {
      it('prints error and return error code', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation()

        try {
          expect(await marpCli([...baseArgs, '--server'])).toBe(1)
          expect(error).toHaveBeenCalledWith(
            expect.stringContaining('specify just one directory')
          )
        } finally {
          error.mockRestore()
        }
      })
    })

    describe('with --preview option', () => {
      it('opens 2 preview windows through Preview.open()', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation()

        try {
          await runForObservation([...baseArgs, '--preview', '--no-output'])
          expect(Preview.prototype.open).toHaveBeenCalledTimes(2)
        } finally {
          warn.mockRestore()
        }
      })
    })
  })

  describe('with passing from stdin', () => {
    let cliInfo: jest.SpyInstance
    let stdout: jest.SpyInstance
    let stdinBuffer: jest.SpyInstance

    beforeEach(() => {
      cliInfo = jest.spyOn(cli, 'info').mockImplementation()
      stdout = jest.spyOn(process.stdout, 'write').mockImplementation()

      stdinBuffer = jest
        .spyOn(getStdin, 'buffer')
        .mockResolvedValue(Buffer.from('# markdown'))

      // reset cached stdin buffer
      ;(File as any).stdinBuffer = undefined
    })

    afterEach(() => {
      cliInfo?.mockRestore()
      stdout?.mockRestore()
      stdinBuffer?.mockRestore()
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
        const error = jest.spyOn(console, 'error').mockImplementation()

        try {
          expect(await marpCli(['--stdin=false'])).toBe(0)
          expect(cliInfo.mock.calls.map(([m]) => m)).not.toContainEqual(
            expect.stringContaining('<stdin> => <stdout>')
          )
          expect(stdout).not.toHaveBeenCalledWith(expect.any(Buffer))
        } finally {
          error.mockRestore()
        }
      })
    })
  })
})

import chalk from 'chalk'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import fromArguments from './config'
import { Converter, ConvertedCallback, ConvertType } from './converter'
import { CLIError, error, isError } from './error'
import { File, FileType } from './file'
import { Preview, fileToURI } from './preview'
import { Server } from './server'
import templates from './templates'
import { isOfficialImage } from './utils/docker'
import { resetExecutablePath } from './utils/puppeteer'
import version from './version'
import watcher, { Watcher, notifier } from './watcher'

enum OptionGroup {
  Basic = 'Basic Options:',
  Converter = 'Converter Options:',
  Template = 'Template Options:',
  PDF = 'PDF Options:',
  Meta = 'Metadata Options:',
  Marp = 'Marp / Marpit Options:',
}

export interface MarpCLIInternalOptions {
  baseUrl?: string
  stdin: boolean
  throwErrorAlways: boolean
}

export type MarpCLIAPIOptions = Pick<MarpCLIInternalOptions, 'baseUrl'>

export type ObservationHelper = { stop: () => void }

const resolversForObservation: Array<(helper: ObservationHelper) => void> = []

const usage = `
Usage:
  marp [options] <files...>
  marp [options] -I <dir>
`.trim()

export const marpCli = async (
  argv: string[],
  { baseUrl, stdin: defaultStdin, throwErrorAlways }: MarpCLIInternalOptions
): Promise<number> => {
  let server: Server | undefined
  let watcherInstance: Watcher | undefined

  try {
    const base: Argv = yargs(argv)
    const program = base
      .parserConfiguration({ 'dot-notation': false })
      .usage(usage)
      .help(false)
      .version(false)
      .options({
        version: {
          alias: 'v',
          describe: 'Show versions',
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        help: {
          alias: 'h',
          describe: 'Show help',
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        output: {
          alias: 'o',
          describe: 'Output file path (or directory when input-dir is passed)',
          group: OptionGroup.Basic,
          type: 'string',
        },
        'input-dir': {
          alias: 'I',
          describe: 'The base directory to find markdown and theme CSS',
          group: OptionGroup.Basic,
          type: 'string',
        },
        'config-file': {
          alias: ['config', 'c'],
          describe: 'Specify path to a configuration file',
          group: OptionGroup.Basic,
          type: 'string',
        },
        'no-config-file': {
          alias: ['no-config'],
          type: 'boolean',
          describe: 'Prevent looking up for a configuration file',
          group: OptionGroup.Basic,
        },
        watch: {
          alias: 'w',
          describe: 'Watch input markdowns for changes',
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        server: {
          alias: 's',
          describe: 'Enable server mode',
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        preview: {
          alias: 'p',
          describe: 'Open preview window',
          hidden: isOfficialImage(),
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        stdin: {
          default: defaultStdin,
          describe: 'Read Markdown from stdin',
          hidden: true, // It is an escape-hatch for advanced user
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        pdf: {
          conflicts: ['image', 'images', 'pptx', 'notes'],
          describe: 'Convert slide deck into PDF',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        pptx: {
          conflicts: ['pdf', 'image', 'images', 'notes'],
          describe: 'Convert slide deck into PowerPoint document',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        notes: {
          conflicts: ['image', 'images', 'pptx', 'pdf'],
          describe: 'Convert slide deck notes into a text file',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        image: {
          conflicts: ['pdf', 'images', 'pptx', 'notes'],
          describe: 'Convert the first slide page into an image file',
          group: OptionGroup.Converter,
          choices: ['png', 'jpeg'],
          coerce: (type: string) => {
            if (type === '') return 'png'
            if (type === 'jpg') return 'jpeg'
            return type
          },
          type: 'string',
        },
        images: {
          conflicts: ['pdf', 'image', 'pptx', 'notes'],
          describe: 'Convert slide deck into multiple image files',
          group: OptionGroup.Converter,
          choices: ['png', 'jpeg'],
          coerce: (type: string) => {
            if (type === '') return 'png'
            if (type === 'jpg') return 'jpeg'
            return type
          },
          type: 'string',
        },
        'image-scale': {
          defaultDescription: '1 (or 2 for PPTX conversion)',
          describe: 'The scale factor for rendered images',
          group: OptionGroup.Converter,
          type: 'number',
        },
        'jpeg-quality': {
          defaultDescription: '85',
          describe: 'Set JPEG image quality',
          group: OptionGroup.Converter,
          type: 'number',
        },
        'allow-local-files': {
          describe:
            'Allow to access local files from Markdown while converting PDF, PPTX, or image (NOT SECURE)',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        template: {
          describe: 'Choose template',
          defaultDescription: 'bespoke',
          group: OptionGroup.Template,
          choices: Object.keys(templates),
          type: 'string',
        },
        'bespoke.osc': {
          describe: '[Bespoke] Use on-screen controller',
          defaultDescription: 'true',
          group: OptionGroup.Template,
          type: 'boolean',
        },
        'bespoke.progress': {
          describe: '[Bespoke] Use progress bar',
          defaultDescription: 'false',
          group: OptionGroup.Template,
          type: 'boolean',
        },
        'bespoke.transition': {
          describe:
            '[Bespoke] Use transitions (Only in browsers supported View Transition API)',
          defaultDescription: 'true',
          group: OptionGroup.Template,
          type: 'boolean',
        },
        'pdf-notes': {
          describe: 'Add presenter notes to PDF as annotations',
          group: OptionGroup.PDF,
          type: 'boolean',
        },
        'pdf-outlines': {
          describe: 'Add outlines (bookmarks) to PDF',
          group: OptionGroup.PDF,
          type: 'boolean',
        },
        'pdf-outlines.pages': {
          describe: 'Make outlines from slide pages',
          defaultDescription: 'true',
          group: OptionGroup.PDF,
          type: 'boolean',
        },
        'pdf-outlines.headings': {
          describe: 'Make outlines from Markdown headings',
          defaultDescription: 'true',
          group: OptionGroup.PDF,
          type: 'boolean',
        },
        title: {
          describe: 'Define title of the slide deck',
          group: OptionGroup.Meta,
          type: 'string',
        },
        description: {
          describe: 'Define description of the slide deck',
          group: OptionGroup.Meta,
          type: 'string',
        },
        author: {
          describe: 'Define author of the slide deck',
          group: OptionGroup.Meta,
          type: 'string',
        },
        keywords: {
          describe: 'Define comma-separated keywords for the slide deck',
          group: OptionGroup.Meta,
          type: 'string',
        },
        url: {
          describe: 'Define canonical URL',
          group: OptionGroup.Meta,
          type: 'string',
        },
        'og-image': {
          describe: 'Define Open Graph image URL',
          group: OptionGroup.Meta,
          type: 'string',
        },
        engine: {
          describe: 'Select Marpit based engine by module name or path',
          group: OptionGroup.Marp,
          type: 'string',
        },
        html: {
          describe: 'Enable or disable HTML tags',
          group: OptionGroup.Marp,
          type: 'boolean',
        },
        theme: {
          describe: 'Override theme by name or CSS file',
          group: OptionGroup.Marp,
          type: 'string',
        },
        'theme-set': {
          array: true,
          describe: 'Path to additional theme CSS files',
          group: OptionGroup.Marp,
          type: 'string',
        },
      })

    const argvRet = await program.argv
    const args = {
      baseUrl, // It's not intended using by the consumer so can't set through CLI arguments
      ...argvRet,
      _: argvRet._.map((v) => v.toString()),
    }

    if (args.help) {
      program.showHelp()
      return 0
    }

    const config = await fromArguments(args)
    if (args.version) return await version(config)

    // Initialize converter
    const converter = new Converter(await config.converterOption())
    const cvtOpts = converter.options

    // Find target markdown files
    const finder = async (): Promise<File[]> => {
      if (cvtOpts.inputDir) {
        if (config.files.length > 0) {
          cli.error('Cannot pass files together with input directory.')
          return []
        }

        // Find directory to keep dir structure of input dir in output
        return File.findDir(cvtOpts.inputDir)
      }

      // Read from stdin
      // (May disable by --no-stdin option to avoid hung up while reading)
      // @see https://github.com/marp-team/marp-cli/issues/93
      const stdin = args.stdin ? await File.stdin() : undefined

      // Regular file finding powered by globby
      return [stdin, ...(await File.find(...config.files))].filter(
        (f): f is File => !!f
      )
    }

    const foundFiles = await finder()
    const { length } = foundFiles

    if (length === 0) {
      if (config.files.length > 0)
        cli.warn('Not found processable Markdown file(s).\n')

      program.showHelp()
      return config.files.length > 0 ? 1 : 0
    }

    // Convert markdown into HTML
    const convertedFiles: File[] = []
    const onConverted: ConvertedCallback = (ret) => {
      const { file: i, newFile: o } = ret
      if (!o) return

      const fn = (f: File, stdio: string) =>
        f.type === FileType.StandardIO ? stdio : f.relativePath()

      convertedFiles.push(o)
      cli.info(
        `${fn(i, '<stdin>')} ${
          o.type === FileType.Null ? 'processed.' : `=> ${fn(o, '<stdout>')}`
        }`,
        { singleLine: true }
      )
    }

    try {
      if (cvtOpts.server) {
        await converter.convertFiles(foundFiles, { onlyScanning: true })
      } else {
        cli.info(`Converting ${length} markdown${length > 1 ? 's' : ''}...`)
        await converter.convertFiles(foundFiles, { onConverted })
      }
    } catch (e: unknown) {
      if (isError(e)) {
        const errorCode = e instanceof CLIError ? e.errorCode : undefined
        error(`Failed converting Markdown. (${e.message})`, errorCode)
      } else {
        throw e
      }
    }

    // Watch mode / Server mode
    if (cvtOpts.watch) {
      return await new Promise<number>((res, rej) =>
        (async () => {
          watcherInstance = watcher(
            [
              ...(cvtOpts.inputDir ? [cvtOpts.inputDir] : config.files),
              ...cvtOpts.themeSet.fnForWatch,
            ],
            {
              converter,
              finder,
              events: {
                onConverted,
                onError: (e) =>
                  cli.error(`Failed converting Markdown. (${e.message})`),
              },
              mode: cvtOpts.server
                ? Watcher.WatchMode.Notify
                : Watcher.WatchMode.Convert,
            }
          )

          // Preview window
          const preview = new Preview()
          preview.on('exit', () => res(0))
          preview.on('opening', (location: string) => {
            const loc = location.substr(0, 50)
            const msg = `[Preview] Opening ${loc}...`
            cli.info(chalk.cyan(msg))
          })

          if (cvtOpts.server) {
            server = new Server(converter, {
              directoryIndex: ['index.md', 'PITCHME.md'], // GitPitch compatible
            })
            server.on('converted', onConverted)
            server.on('error', (e) => cli.error(e.toString()))

            await server.start()

            const url = `http://localhost:${server.port}`
            const message = `[Server mode] Start server listened at ${url}/ ...`

            cli.info(chalk.green(message))
            if (cvtOpts.preview) await preview.open(url)
          } else {
            cli.info(chalk.green('[Watch mode] Start watching...'))

            if (cvtOpts.preview) {
              for (const file of convertedFiles) {
                if (cvtOpts.type === ConvertType.pptx) continue
                await preview.open(fileToURI(file, cvtOpts.type))
              }
            }
          }

          let resolverForObservation:
            | ((helper: ObservationHelper) => void)
            | undefined

          while ((resolverForObservation = resolversForObservation.shift())) {
            resolverForObservation({ stop: () => res(0) })
          }
        })().catch(rej)
      )
    }

    return 0
  } catch (e: unknown) {
    if (throwErrorAlways || !(e instanceof CLIError)) throw e

    cli.error(e.message)

    return e.errorCode
  } finally {
    await Promise.all([
      notifier.stop(),
      Converter.closeBrowser(),
      server?.stop(),
      watcherInstance?.chokidar.close(),
    ])
  }
}

export const waitForObservation = () =>
  new Promise<ObservationHelper>((res) => {
    resolversForObservation.push(res)
  })

export const apiInterface = (argv: string[], opts: MarpCLIAPIOptions = {}) => {
  resetExecutablePath()

  return marpCli(argv, {
    ...opts,
    stdin: false,
    throwErrorAlways: true,
  })
}

export const cliInterface = (argv: string[] = []) =>
  marpCli(argv, {
    stdin: true,
    throwErrorAlways: false,
  })

export default cliInterface

import chalk from 'chalk'
import { availableFinders } from './browser/finder'
import { BrowserManager } from './browser/manager'
import * as cli from './cli'
import { DEFAULT_PARALLEL, fromArguments } from './config'
import { Converter, ConvertedCallback, ConvertType } from './converter'
import { CLIError, CLIErrorCode, error, isError } from './error'
import { File, FileType } from './file'
import { Preview, fileToURI } from './preview'
import { Server } from './server'
import templates from './templates'
import { isOfficialDockerImage } from './utils/container'
import { createYargs } from './utils/yargs'
import version from './version'
import watcher, { Watcher, notifier } from './watcher'

const OptionGroup = {
  Basic: 'Basic Options:',
  Converter: 'Converter Options:',
  Template: 'Template Options:',
  Browser: 'Browser Options:',
  PDF: 'PDF Options:',
  Meta: 'Metadata Options:',
  Marp: 'Marp / Marpit Options:',
} as const

export interface MarpCLIOptions {
  baseUrl?: string
  stdin: boolean
  throwErrorAlways: boolean
}

export type MarpCLIAPIOptions = Pick<MarpCLIOptions, 'baseUrl'>

export interface MarpCLICLIOptions {
  debug?: string | boolean
}

export interface ObservationHelper {
  stop: () => void
}

const resolversForObservation: ((helper: ObservationHelper) => void)[] = []

const usage = `
Usage:
  marp [options] <files...>
  marp [options] -I <dir>
`
  .trim()
  .replaceAll(' ', '\u2009') // https://github.com/yargs/yargs/issues/2120#issuecomment-1065802242

const coerceImage = (image: string) => {
  if (image === '') return 'png'

  const normalized = image.toLowerCase().trim()
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpeg'
  if (normalized === 'png') return 'png'

  return image // Expect to be handled error by yargs
}

const coerceBrowser = (browser: string | false) => {
  if (browser === false) return []

  const normalize = (str: string) => str.toLowerCase().trim()
  const isAvailable = (finder: string) =>
    (availableFinders as string[]).includes(normalize(finder))

  const normalized = normalize(browser)
  if (normalized === '' || normalized === 'auto') return 'auto'
  if (isAvailable(normalized)) return normalized

  // Try parsing as comma-separated list
  const browsers = normalized
    .split(',')
    .flatMap((b) => (isAvailable(normalize(b)) ? normalize(b) : []))

  if (browsers.length > 1) return browsers
  if (browsers.length === 1) return browsers[0]

  return browser // Expect to be handled error by yargs
}

const coerceBrowserProtocol = (protocol: string | false) => {
  if (protocol === false) return undefined

  const normalized = protocol.toLowerCase().trim()

  if (normalized === 'cdp' || normalized === 'webdriver-bidi') return normalized
  if (normalized === 'webdriver') return 'webdriver-bidi'
  if (normalized === 'bidi') return 'webdriver-bidi'

  return protocol // Expect to be handled error by yargs
}

const coerceBrowserTimeout = (timeout: string | number | boolean) => {
  const t = timeout.toString()
  if (timeout === false || t.toLowerCase() === 'false') return 0
  if (timeout === true || t.toLowerCase() === 'true') return undefined

  const [num, base] = (() => {
    if (t.endsWith('ms')) return [t.slice(0, -2), 0.001]
    if (t.endsWith('s')) return [t.slice(0, -1), 1]
    return [t, 1]
  })()

  const parsed = Number.parseFloat(num)

  if (Number.isNaN(parsed) || parsed < 0)
    error(`Invalid number for timeout: ${t}`)

  return parsed * base
}

export const marpCli = async (
  argv: string[],
  { baseUrl, stdin: defaultStdin, throwErrorAlways }: MarpCLIOptions
): Promise<number> => {
  let browserManager: BrowserManager | undefined
  let server: Server | undefined
  let watcherInstance: Watcher | undefined

  try {
    const program = createYargs(argv)
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
        debug: {
          // NOTE: This option will not be parsed by yargs because it has been pre-parsed by prepare.ts
          alias: 'd',
          describe: 'Show debug logs (bool or filter pattern)',
          defaultDescription: 'false',
          group: OptionGroup.Basic,
          type: 'string',
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
        parallel: {
          alias: ['P'],
          default: DEFAULT_PARALLEL,
          describe: 'Number of max parallel processes for multiple conversions',
          group: OptionGroup.Basic,
          type: 'number',
        },
        'no-parallel': {
          describe: 'Disable parallel processing',
          group: OptionGroup.Basic,
          type: 'boolean',
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
          hidden: isOfficialDockerImage(),
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
          coerce: coerceImage,
          type: 'string',
        },
        images: {
          conflicts: ['pdf', 'image', 'pptx', 'notes'],
          describe: 'Convert slide deck into multiple image files',
          group: OptionGroup.Converter,
          choices: ['png', 'jpeg'],
          coerce: coerceImage,
          type: 'string',
        },
        'image-scale': {
          defaultDescription: '1 (or 2 for PPTX)',
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
          defaultDescription: '"bespoke"',
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
            '[Bespoke] Use transitions (Only in browsers supported View Transitions API)',
          defaultDescription: 'true',
          group: OptionGroup.Template,
          type: 'boolean',
        },
        browser: {
          describe:
            'The kind of browser to use for PDF, PPTX, and image conversion',
          choices: ['auto', ...availableFinders],
          defaultDescription: '"auto"',
          group: OptionGroup.Browser,
          coerce: coerceBrowser,
          type: 'string',
        },
        'browser-path': {
          describe:
            'Path to the browser executable (Find automatically if not set)',
          group: OptionGroup.Browser,
          type: 'string',
        },
        'browser-protocol': {
          describe: 'Preferred protocol to use for browser connection',
          choices: ['cdp', 'webdriver-bidi'],
          defaultDescription: '"cdp"',
          group: OptionGroup.Browser,
          coerce: coerceBrowserProtocol,
          type: 'string',
        },
        'browser-timeout': {
          describe:
            'Timeout for each browser operation in seconds (0 to disable)',
          defaultDescription: '30',
          group: OptionGroup.Browser,
          coerce: coerceBrowserTimeout,
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
      .fail((msg, _err, yargs) => {
        console.error(yargs.help())
        console.error('')
        console.error(msg)

        error(msg, CLIErrorCode.INVALID_OPTIONS)
      })

    const argvRet = await program.argv
    const args = {
      baseUrl, // It's not intended using by the consumer so can't set through CLI arguments
      ...argvRet,
      _: argvRet._.map((v) => v.toString()),
    }

    if (args.help) {
      program.showHelp('log')
      return 0
    }

    const config = await fromArguments(args)
    if (args.version) return await version(config)

    // Initialize browser manager
    browserManager = new BrowserManager(config.browserManagerOption())

    // Initialize converter
    const converter = new Converter({
      ...(await config.converterOption()),
      browserManager,
    })
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
      if (config.files.length > 0) {
        cli.warn('Not found processable Markdown file(s).\n')
        program.showHelp('error')
        return 1
      } else {
        program.showHelp('log')
        return 0
      }
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
        const isParallel = Math.min(converter.options.parallel ?? 1, length) > 1

        cli.info(
          `Converting ${length} markdown${length > 1 ? 's' : ''}...${isParallel ? ` (Parallelism: up to ${converter.options.parallel} workers)` : ''}`
        )

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
          const preview = new Preview({ browserManager: browserManager! })
          preview.on('exit', () => res(0))
          preview.on('opening', (location: string) => {
            const loc = location.substring(0, 50)
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

    // yargs error (already handled by yargs.fail())
    if (e instanceof CLIError && e.errorCode === CLIErrorCode.INVALID_OPTIONS)
      return 1

    cli.error(e.message)

    return e.errorCode
  } finally {
    await Promise.all([
      notifier.stop(),
      browserManager?.dispose(),
      server?.stop(),
      watcherInstance?.chokidar.close(),
    ])
  }
}

export const waitForObservation = () =>
  new Promise<ObservationHelper>((res) => {
    resolversForObservation.push(res)
  })

export const apiInterface = (argv: string[], opts: MarpCLIAPIOptions = {}) =>
  marpCli(argv, { ...opts, stdin: false, throwErrorAlways: true })

export const cliInterface = (argv: string[]) => {
  if (process.env.DEBUG) {
    cli.info(
      `Debug logging is enabled. (Filter pattern: ${chalk.yellow(process.env.DEBUG)})`
    )
  }
  return marpCli(argv, { stdin: true, throwErrorAlways: false })
}

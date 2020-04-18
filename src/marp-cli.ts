import chalk from 'chalk'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import fromArguments from './config'
import { Converter, ConvertedCallback, ConvertType } from './converter'
import { CLIError, error } from './error'
import { File, FileType } from './file'
import { Preview, fileToURI } from './preview'
import { Server } from './server'
import templates from './templates'
import version from './version'
import watcher, { Watcher, notifier } from './watcher'

enum OptionGroup {
  Basic = 'Basic Options:',
  Converter = 'Converter Options:',
  Template = 'Template Options:',
  Meta = 'Meta Options:',
  Marp = 'Marp / Marpit Options:',
}

const usage = `
Usage:
  marp [options] <files...>
  marp [options] -I <dir>
`.trim()

export default async function (argv: string[] = []): Promise<number> {
  let watcherInstance: Watcher | undefined

  try {
    const base: Argv = yargs(argv)
    const program = base
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
          alias: 'c',
          describe: 'Specify path to configuration file',
          group: OptionGroup.Basic,
          type: 'string',
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
          describe: 'Open preview window (EXPERIMENTAL)',
          // hidden: !!process.env.IS_DOCKER,
          hidden: true, // https://github.com/marp-team/marp-cli/issues/211
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        stdin: {
          default: true,
          describe: 'Read Markdown from stdin',
          hidden: true, // It is an escape-hatch for advanced user
          group: OptionGroup.Basic,
          type: 'boolean',
        },
        pdf: {
          conflicts: ['image', 'images', 'pptx'],
          describe: 'Convert slide deck into PDF',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        pptx: {
          conflicts: ['pdf', 'image', 'images'],
          describe: 'Convert slide deck into PowerPoint document',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        image: {
          conflicts: ['pdf', 'images', 'pptx'],
          describe: 'Convert the first slide page into an image file',
          group: OptionGroup.Converter,
          choices: ['png', 'jpeg'],
          coerce: (type: string) => (type === 'jpg' ? 'jpeg' : type),
          type: 'string',
        },
        images: {
          conflicts: ['pdf', 'image', 'pptx'],
          describe: 'Convert slide deck into multiple image files',
          group: OptionGroup.Converter,
          choices: ['png', 'jpeg'],
          coerce: (type: string) => (type === 'jpg' ? 'jpeg' : type),
          type: 'string',
        },
        'jpeg-quality': {
          defaultDescription: '85',
          describe: 'Setting JPEG image quality',
          group: OptionGroup.Converter,
          type: 'number',
        },
        'allow-local-files': {
          describe:
            'Allow to access local files from Markdown while converting PDF and image (NOT SECURE)',
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
          describe: 'Enable or disable HTML tag',
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

    const args = program.argv

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
    const finder = async () => {
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
      return <File[]>(
        [stdin, ...(await File.find(...config.files))].filter((f) => f)
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
    } catch (e) {
      error(`Failed converting Markdown. (${e.message})`, e.errorCode)
    }

    // Watch mode / Server mode
    if (cvtOpts.watch) {
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
      preview.on('exit', () => process.exit())
      preview.on('opening', (location: string) => {
        cli.warn(
          `${chalk.yellow`[DEPRECATION WARNING]`} Due to the unmaintained dependent package ${chalk.cyan`carlo`} and incompatible Chrome / Chromium >= 81, the EXPERIMENTAL preview option provided by ${chalk.yellow`--preview`} or ${chalk.yellow`-p`} may no longer work correctly. See details: ${chalk.blueBright`https://github.com/marp-team/marp-cli/issues/211`}`
        )
        const loc = location.substr(0, 50)
        const msg = `[Preview] (EXPERIMENTAL) Opening ${loc}...`
        cli.info(chalk.cyan(msg))
      })

      if (cvtOpts.server) {
        const server = new Server(converter, {
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
    }

    return 0
  } catch (e) {
    if (!(e instanceof CLIError)) throw e

    cli.error(e.message)

    // Stop running notifier and watcher to exit process correctly
    // (NOTE: Don't close in the finally block to keep watching)
    notifier.stop()
    if (watcherInstance) watcherInstance.chokidar.close()

    return e.errorCode
  } finally {
    await Converter.closeBrowser()
  }
}

import chalk from 'chalk'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import fromArguments from './config'
import { Converter, ConvertedCallback } from './converter'
import { CLIError, error } from './error'
import { File, FileType } from './file'
import { carlo, Preview, ServerPreview } from './preview'
import { Server } from './server'
import templates from './templates'
import version from './version'
import watcher, { Watcher } from './watcher'

enum OptionGroup {
  Basic = 'Basic Options:',
  Converter = 'Converter Options:',
  Marp = 'Marp / Marpit Options:',
}

const usage = `
Usage:
  marp [options] <files...>
  marp [options] -I <dir>
`.trim()

export default async function(argv: string[] = []): Promise<number> {
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
        ...(carlo
          ? {
              preview: {
                describe: 'Open preview window (EXPERIMENTAL)',
                group: OptionGroup.Basic,
                type: 'boolean',
              },
            }
          : {}),
        pdf: {
          describe: 'Convert slide deck into PDF',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        template: {
          describe: 'Choose template',
          group: OptionGroup.Converter,
          choices: Object.keys(templates),
          type: 'string',
        },
        'allow-local-files': {
          describe:
            'Allow to access local files from Markdown while converting PDF (NOT SECURE)',
          group: OptionGroup.Converter,
          type: 'boolean',
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

      // Regular file finding powered by globby
      return <File[]>(
        [await File.stdin(), ...(await File.find(...config.files))].filter(
          f => f
        )
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

    if (!cvtOpts.server)
      cli.info(`Converting ${length} markdown${length > 1 ? 's' : ''}...`)

    // Convert markdown into HTML
    const onConverted: ConvertedCallback = ret => {
      const { file, newFile } = ret
      const output = (f: File, io: string) =>
        f.type === FileType.StandardIO ? `<${io}>` : f.relativePath()

      cli.info(`${output(file, 'stdin')} => ${output(newFile, 'stdout')}`)
    }

    try {
      await converter.convertFiles(foundFiles, { onConverted, initial: true })
    } catch (e) {
      error(`Failed converting Markdown. (${e.message})`, e.errorCode)
    }

    // Watch mode / Server mode
    if (cvtOpts.watch) {
      watcher(
        [
          ...(cvtOpts.inputDir ? [cvtOpts.inputDir] : config.files),
          ...cvtOpts.themeSet.fnForWatch,
        ],
        {
          converter,
          finder,
          events: {
            onConverted,
            onError: e =>
              cli.error(`Failed converting Markdown. (${e.message})`),
          },
          mode: cvtOpts.server
            ? Watcher.WatchMode.Notify
            : Watcher.WatchMode.Convert,
        }
      )

      let preview: Preview | undefined = undefined

      if (cvtOpts.server) {
        const server = new Server(converter, {
          onConverted,
          directoryIndex: ['index.md', 'PITCHME.md'], // GitPitch compatible
        })
        await server.start()

        const url = `http://localhost:${server.port}`
        const message = `[Server mode] Start server listened at ${url}/ ...`

        cli.info(chalk.green(message))
        if (cvtOpts.preview) preview = new ServerPreview(url)
      } else {
        if (cvtOpts.preview) {
          cli.warn(
            chalk.yellow(
              'Currently a preview window can open only in server mode.'
            )
          )
        }
        cli.info(chalk.green('[Watch mode] Start watching...'))
      }

      if (preview) {
        cli.info(
          chalk.cyan(
            '[Preview window] (EXPERIMENTAL) Opening preview window...'
          )
        )
        await preview.open()
        preview.on('exit', () => process.exit())
      }
    }

    return 0
  } catch (e) {
    if (!(e instanceof CLIError)) throw e

    cli.error(e.message)
    return e.errorCode
  } finally {
    await Converter.closeBrowser()
  }
}

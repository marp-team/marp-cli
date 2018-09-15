import { version as coreVersion } from '@marp-team/marp-core/package.json'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import fromArguments, { IMarpCLIArguments } from './config'
import { Converter } from './converter'
import { CLIError, error } from './error'
import { File, FileType } from './file'
import templates from './templates'
import { name, version } from '../package.json'

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
      .version(
        'version',
        'Show package versions',
        `${name} v${version} (/w @marp-team/marp-core v${coreVersion})`
      )
      .alias('version', 'v')
      .group('version', OptionGroup.Basic)
      .options({
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
          describe: 'The base input directory to find markdown',
          group: OptionGroup.Basic,
          type: 'string',
        },
        'config-file': {
          alias: 'c',
          describe: 'Specify path to configuration file',
          group: OptionGroup.Basic,
          type: 'string',
        },
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
          describe: 'Override theme',
          group: OptionGroup.Marp,
          type: 'string',
        },
      })

    const args = program.argv

    if (args.help) {
      program.showHelp()
      return 0
    }

    // Initialize converter
    const config = await fromArguments(<IMarpCLIArguments>args)
    const converterOpts = await config.converterOption()
    const converter = new Converter(converterOpts)

    // Find target markdown files
    const files = await (async (): Promise<File[]> => {
      if (converterOpts.inputDir) {
        if (args._.length > 0) {
          cli.error('Cannot pass files together with input directory.')
          return []
        }

        // Find directory to keep dir structure of input dir in output
        return File.findDir(converterOpts.inputDir)
      }

      // Regular file finding powered by globby
      return <File[]>(
        [await File.stdin(), ...(await File.find(...args._))].filter(f => f)
      )
    })()

    const { length } = files

    if (length === 0) {
      if (args._.length > 0)
        cli.warn('Not found processable Markdown file(s).\n')

      program.showHelp()
      return args._.length > 0 ? 1 : 0
    }

    cli.info(`Converting ${length} markdown${length > 1 ? 's' : ''}...`)

    // Convert markdown into HTML
    try {
      await converter.convertFiles(files, ret => {
        const { file, newFile } = ret
        const output = (f: File, io: string) =>
          f.type === FileType.StandardIO ? `<${io}>` : f.relativePath()

        cli.info(`${output(file, 'stdin')} => ${output(newFile, 'stdout')}`)
      })
    } catch (e) {
      error(`Failed converting Markdown. (${e.message})`, e.errorCode)
    }

    return 0
  } catch (e) {
    if (!(e instanceof CLIError)) throw e

    cli.error(e.message)
    return e.errorCode
  }
}

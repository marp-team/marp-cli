import { Marp } from '@marp-team/marp-core'
import { version as coreVersion } from '@marp-team/marp-core/package.json'
import osLocale from 'os-locale'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import { Converter, ConvertType } from './converter'
import { CLIError, error } from './error'
import { File, FileType } from './file'
import { MarpReadyScript } from './ready'
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
          describe: 'Output file name',
          group: OptionGroup.Basic,
          type: 'string',
        },
        pdf: {
          default: false,
          describe: 'Convert slide deck into PDF',
          group: OptionGroup.Converter,
          type: 'boolean',
        },
        template: {
          default: 'bespoke',
          describe: 'Template name',
          group: OptionGroup.Converter,
          choices: Object.keys(templates),
          type: 'string',
        },
        'allow-local-files': {
          default: false,
          describe:
            'Allow to access local files from Markdown while converting PDF (INSECURE)',
          group: OptionGroup.Converter,
          type: 'boolean',
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
    const converter = new Converter({
      allowLocalFiles: args.allowLocalFiles,
      engine: Marp,
      html: args.html,
      lang: (await osLocale()).replace(/[_@]/g, '-'),
      options: {},
      output: args.output,
      readyScript: await MarpReadyScript.bundled(),
      template: args.template,
      theme: args.theme,
      type:
        args.pdf || `${args.output}`.toLowerCase().endsWith('.pdf')
          ? ConvertType.pdf
          : ConvertType.html,
    })

    // Find target markdown files
    const files = <File[]>(
      [await File.stdin(), ...(await File.find(...args._))].filter(f => f)
    )
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

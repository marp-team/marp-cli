import { Marp } from '@marp-team/marp-core'
import { version as coreVersion } from '@marp-team/marp-core/package.json'
import path from 'path'
import globby from 'globby'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import { Converter } from './converter'
import { CLIError, error } from './error'
import templates from './templates'
import { name, version } from '../package.json'

enum OptionGroup {
  Basic = 'Basic Options:',
  Converter = 'Converter Options:',
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
      .help('error')
      .alias('help', 'h')
      .version(
        'version',
        'Show package versions',
        `${name} v${version} (/w @marp-team/marp-core v${coreVersion})`
      )
      .alias('version', 'v')
      .group(['help', 'version'], OptionGroup.Basic)
      .options({
        output: {
          alias: 'o',
          describe: 'Output file name',
          group: OptionGroup.Basic,
          type: 'string',
        },
        engine: {
          describe: 'Engine module to conversion',
          group: OptionGroup.Converter,
          type: 'string',
        },
        'engine-name': {
          describe: "Engine module's exported name",
          group: OptionGroup.Converter,
          type: 'string',
        },
        template: {
          describe: 'Template name',
          group: OptionGroup.Converter,
          choices: Object.keys(templates),
          type: 'string',
        },
        theme: {
          describe: 'Override theme',
          group: OptionGroup.Converter,
          type: 'string',
        },
      })

    const args = program.argv

    const converter = new Converter({
      engine: args.engine || Marp,
      engineName: args.engineName || 'default',
      options: {},
      template: args.template || 'bare',
      theme: args.theme,
    })

    // Find target markdown files
    const files = await globby(args._, {
      absolute: true,
      expandDirectories: { files: ['*.md', '*.mdown', '*.markdown'] },
    })

    if (files.length === 0) {
      if (args._.length > 0)
        cli.warn('Not found processable Markdown file(s).\n')

      program.showHelp()
      return 0
    }

    const plural = files.length > 1 ? 's' : ''
    cli.info(`Converting ${files.length} file${plural}...`)

    // Convert markdown into HTML
    try {
      const processed = await converter.convertFiles(...files)

      processed.forEach(result => {
        const originalPath = path.relative(process.cwd(), result.path)
        const newPath = path.relative(process.cwd(), result.newPath)

        cli.info(`${originalPath} => ${newPath}`)
      })
    } catch (e) {
      error(`Failed converting Markdown (${e.message})`)
    }

    return 0
  } catch (e) {
    if (e instanceof CLIError) {
      cli.error(e.message)
      return e.errorCode
    }
    throw e
  }
}

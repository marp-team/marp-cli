import { Marp } from '@marp-team/marp-core'
import { version as coreVersion } from '@marp-team/marp-core/package.json'
import path from 'path'
import globby from 'globby'
import { Argv } from 'yargs'
import yargs from 'yargs/yargs'
import * as cli from './cli'
import { Converter, ConverterOption } from './converter'
import { CLIError, error } from './error'
import { name, version } from '../package.json'

export default async function(argv: string[] = []): Promise<number> {
  try {
    const base: Argv = yargs(argv)
    const program = base
      .alias('help', 'h')
      .version(
        'version',
        'Show package versions',
        `${name} v${version} (/w @marp-team/marp-core v${coreVersion})`
      )
      .alias('version', 'v')
      .option('engine', {
        describe: 'Engine module to conversion',
        type: 'string',
      })
      .option('engineName', {
        describe: "Engine module's exported name",
        type: 'string',
      })
      .option('template', {
        describe: 'Template name',
        type: 'string',
      })

    const args = program.argv

    const converter = new Converter({
      engine: args.engine || Marp,
      engineName: args.engineName || 'default',
      template: args.template || 'bare',
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

    // Convert markdown into HTML
    try {
      const processed = await converter.convertFiles(...files)

      processed.forEach(opts => {
        cli.info(
          `${path.relative(process.cwd(), opts.path)} => ${path.relative(
            process.cwd(),
            opts.newPath
          )}`
        )
      })
    } catch (e) {
      error(`Failed convert Markdown (${e.message})`)
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

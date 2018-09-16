import chalk from 'chalk'
import chokidar from 'chokidar'
import path from 'path'
import * as cli from './cli'
import { Converter, ConvertedCallback } from './converter'
import { File } from './file'

export class Watcher {
  chokidar: chokidar.FSWatcher

  readonly converter: Converter
  readonly events: Watcher.Events
  readonly finder: Watcher.Options['finder']

  private constructor(watchPath: string | string[], opts: Watcher.Options) {
    this.converter = opts.converter
    this.finder = opts.finder
    this.events = opts.events

    this.chokidar = chokidar.watch(watchPath, { ignoreInitial: true })
    this.chokidar
      .on('change', f => this.convert(f))
      .on('add', f => this.convert(f))

    cli.info(chalk.green('[Watch mode] Start watching...'))
  }

  private async convert(fn) {
    const files = (await this.finder()).filter(
      f => path.resolve(f.path) === path.resolve(fn)
    )

    try {
      await this.converter.convertFiles(files, this.events.onConverted)
    } catch (e) {
      this.events.onError(e)
    }
  }

  static watch(watchPath: string | string[], opts: Watcher.Options) {
    return new Watcher(watchPath, opts)
  }
}

export default Watcher.watch

export namespace Watcher {
  export interface Options {
    converter: Converter
    events: Watcher.Events
    finder: () => Promise<File[]>
  }

  export interface Events {
    onConverted: ConvertedCallback
    onError: (e: Error) => void
  }
}

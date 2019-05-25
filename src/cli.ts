import chalk from 'chalk'
import stripAnsi from 'strip-ansi'
import wrapAnsi from 'wrap-ansi'
import { terminalWidth } from 'yargs'

interface CLIOption {
  singleLine?: boolean
}

const width: number = terminalWidth() || 80

const messageBlock = (
  kind: string,
  message: string,
  opts: CLIOption
): string => {
  const indent = stripAnsi(kind).length + 1
  const target = opts.singleLine ? message : wrapAnsi(message, width - indent)

  return `${kind} ${target.split('\n').join(`\n${' '.repeat(indent)}`)}`
}

let silent = false

export function silence(value: boolean) {
  silent = value
}

export function info(message: string, opts: CLIOption = {}): void {
  // Use console.warn to output into stderr
  if (!silent)
    console.warn(messageBlock(chalk.bgCyan.black('[  INFO ]'), message, opts))
}

export function warn(message: string, opts: CLIOption = {}): void {
  if (!silent)
    console.warn(messageBlock(chalk.bgYellow.black('[  WARN ]'), message, opts))
}

export function error(message: string, opts: CLIOption = {}): void {
  console.error(messageBlock(chalk.bgRed.white('[ ERROR ]'), message, opts))
}

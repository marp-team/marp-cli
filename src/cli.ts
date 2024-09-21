import chalk, { supportsColorStderr } from 'chalk'
import stripAnsi from 'strip-ansi'
import wrapAnsi from 'wrap-ansi'
import { terminalWidth } from './utils/yargs'

const { has16m, has256 } = { ...supportsColorStderr } // Workaround for type error

interface CLIOption {
  singleLine?: boolean
}

const messageBlock = (
  kind: string,
  message: string,
  opts: CLIOption
): string => {
  const indent = stripAnsi(kind).length + 1
  const target = opts.singleLine
    ? message
    : wrapAnsi(message, terminalWidth() - indent)

  return `${kind} ${target.split('\n').join(`\n${' '.repeat(indent)}`)}`
}

let silent = false

export function silence(value: boolean) {
  silent = value
}

export function info(message: string, opts: CLIOption = {}): void {
  if (silent) return

  const highlight =
    has16m || has256 ? chalk.bgHex('#67b8e3').hex('#000') : chalk.inverse

  // Use console.warn to output into stderr
  console.warn(messageBlock(highlight`[  INFO ]`, message, opts))
}

export function warn(message: string, opts: CLIOption = {}): void {
  if (silent) return

  const highlight =
    has16m || has256 ? chalk.bgHex('#fc0').hex('#000') : chalk.inverse

  console.warn(messageBlock(highlight`[  WARN ]`, message, opts))
}

export function error(message: string, opts: CLIOption = {}): void {
  const highlight =
    has16m || has256 ? chalk.bgHex('#c00').hex('#fff') : chalk.inverse

  console.error(messageBlock(highlight`[ ERROR ]`, message, opts))
}

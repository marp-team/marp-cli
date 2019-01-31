import chalk from 'chalk'

let silent = false

export function silence(value: boolean) {
  silent = value
}

export function info(message: string): void {
  // Use console.warn to output into stderr
  if (!silent) console.warn(`${chalk.bgCyan.black('[  INFO ]')} ${message}`)
}

export function warn(message: string): void {
  if (!silent) console.warn(`${chalk.bgYellow.black('[  WARN ]')} ${message}`)
}

export function error(message: string): void {
  console.error(`${chalk.bgRed.white('[ ERROR ]')} ${message}`)
}

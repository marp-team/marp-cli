import chalk from 'chalk'

export function info(message: string): void {
  console.info(`${chalk.bgCyan.black('[  INFO ]')} ${message}`)
}

export function warn(message: string): void {
  console.warn(`${chalk.bgYellow.black('[  WARN ]')} ${message}`)
}

export function error(message: string): void {
  console.error(`${chalk.bgRed.white('[ ERROR ]')} ${message}`)
}

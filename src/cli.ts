import chalk from 'chalk'

export function info(message: string): void {
  console.info(`${chalk.black.bgCyan('[  INFO ]')} ${message}`)
}

export function warn(message: string): void {
  console.warn(`${chalk.black.bgYellow('[  WARN ]')} ${message}`)
}

export function error(message: string): void {
  console.error(`${chalk.white.bgRed('[ ERROR ]')} ${message}`)
}

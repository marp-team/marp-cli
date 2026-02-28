import { PuppeteerError } from 'puppeteer-core'
import { debug } from './utils/debug'

export class CLIError extends Error {
  readonly errorCode: number
  readonly message: string
  readonly name = 'CLIError'

  constructor(message: string, errorCode: number = CLIErrorCode.GENERAL_ERROR) {
    super()
    this.message = message
    this.errorCode = errorCode
  }

  toString() {
    return this.message
  }
}

export const CLIErrorCode = {
  INVALID_OPTIONS: -1,
  GENERAL_ERROR: 1,
  NOT_FOUND_BROWSER: 2,
  LISTEN_PORT_IS_ALREADY_USED: 3,
  CANNOT_SPAWN_SNAP_CHROMIUM: 4,
  NOT_FOUND_SOFFICE: 5,

  /** @deprecated NOT_FOUND_CHROMIUM is renamed to NOT_FOUND_BROWSER. */
  NOT_FOUND_CHROMIUM: 2,
} as const

export function error(
  msg: string,
  errorCode: number = CLIErrorCode.GENERAL_ERROR
): never {
  const cliError = new CLIError(msg, errorCode)
  debug('%O', cliError)

  throw cliError
}

export const isError = (e: unknown): e is NodeJS.ErrnoException => {
  if (e instanceof Error) return true
  if (e instanceof PuppeteerError) return true

  const tag = Object.prototype.toString.call(e)
  return tag === '[object Error]' || /^\[object .+Error\]$/i.test(tag)
}

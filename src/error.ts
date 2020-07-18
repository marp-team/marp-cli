export class CLIError implements Error {
  readonly errorCode: number
  readonly message: string
  readonly name = 'CLIError'

  constructor(message: string, errorCode = 1) {
    this.message = message
    this.errorCode = errorCode
  }

  toString() {
    return this.message
  }
}

export function error(msg: string, errorCode = 1): never {
  throw new CLIError(msg, errorCode)
}

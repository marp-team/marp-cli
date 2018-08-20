export class CLIError implements Error {
  name = 'CLIError'

  constructor(public message: string, public errorCode: number = 1) {}

  toString() {
    return this.message
  }
}

export function error(msg: string, errorCode = 1): never {
  throw new CLIError(msg, errorCode)
}

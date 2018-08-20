export class CLIError implements Error {
  name = 'CLIError'

  constructor(public message: string, public errorCode: number = 1) {}

  toString() {
    return this.message
  }
}

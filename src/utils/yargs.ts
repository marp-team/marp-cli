import type { Argv } from 'yargs'
import yargs from 'yargs'

let currentYargsRef: WeakRef<Argv> | null = null

export const createYargs = () => {
  const currentYargs = yargs()
  currentYargsRef = new WeakRef(currentYargs)

  // Force to use English locale while testing
  if (process.env.NODE_ENV === 'test') currentYargs.locale('en')

  return currentYargs
}

export const terminalWidth = () =>
  currentYargsRef?.deref()?.terminalWidth() ?? 80

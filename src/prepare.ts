export const defaultDebug = 'marp-cli*'

const debugOptionMatcher = /^(?:-d|--debug)(?:$|=)/

const enableValues = ['true', '1']
const falseValues = ['false', '0']
const starValues = ['all', 'full']

const parseDebugValue = (value: string) => {
  const trimmedValue = value.trim()
  const normalizedValue = trimmedValue.toLowerCase()

  if (starValues.includes(normalizedValue)) return '*'
  if (enableValues.includes(normalizedValue)) return defaultDebug
  if (falseValues.includes(normalizedValue)) return false

  return trimmedValue || defaultDebug
}

export const cliPrepare = (args = process.argv.slice(2)) => {
  // Parse debug option
  let debug: string | false = false

  const normalizedArgs = [...args]
  const dbgIdx = normalizedArgs.findIndex((arg) => debugOptionMatcher.test(arg))

  if (dbgIdx >= 0) {
    const dbgOption = normalizedArgs[dbgIdx]

    if (dbgOption.startsWith('-d=') || dbgOption.startsWith('--debug=')) {
      debug = parseDebugValue(dbgOption.slice(dbgOption.indexOf('=') + 1))
      normalizedArgs.splice(dbgIdx, 1)
    } else {
      const nextArg = normalizedArgs[dbgIdx + 1]

      if (!nextArg || nextArg.startsWith('-')) {
        debug = defaultDebug
        normalizedArgs.splice(dbgIdx, 1)
      } else {
        debug = parseDebugValue(nextArg)
        normalizedArgs.splice(dbgIdx, 2)
      }
    }
  }

  return { args: normalizedArgs, debug }
}

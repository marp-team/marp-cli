import { CLIError, CLIErrorCode } from '../error'
import { debugBrowserFinder } from '../utils/debug'
import type { Browser } from './browser'
import { chromeFinder as chrome } from './finders/chrome'
import { edgeFinder as edge } from './finders/edge'
import { firefoxFinder as firefox } from './finders/firefox'
import { isExecutable, normalizeDarwinAppPath } from './finders/utils'

export interface BrowserFinderResult {
  path: string
  acceptedBrowsers: (typeof Browser)[]
}

export interface BrowserFinderOptions {
  preferredPath?: string
}

export type BrowserFinder = (
  opts: BrowserFinderOptions
) => Promise<BrowserFinderResult>

const finderMap = { chrome, edge, firefox } as const

export type FinderName = keyof typeof finderMap

export const defaultFinders = ['chrome', 'edge', 'firefox'] as const

export const findBrowser = async (
  finders: readonly FinderName[] = defaultFinders,
  opts: BrowserFinderOptions = {}
) => {
  const finderCount = finders.length
  const normalizedOpts = {
    preferredPath: await (async () => {
      if (opts.preferredPath) {
        const normalized = await normalizeDarwinAppPath(opts.preferredPath)
        if (await isExecutable(normalized)) return normalized
      }
      return undefined
    })(),
  }

  if (finderCount === 0) {
    debugBrowserFinder('No browser finder specified.')

    if (normalizedOpts.preferredPath) {
      debugBrowserFinder(
        'Use preferred path as Chrome: %s',
        normalizedOpts.preferredPath
      )

      return await chrome(normalizedOpts)
    }

    throw new CLIError(
      'No suitable browser found.',
      CLIErrorCode.NOT_FOUND_BROWSER
    )
  }

  debugBrowserFinder(
    `Start finding browser from ${finders.join(', ')} (%o)`,
    normalizedOpts
  )

  return new Promise<BrowserFinderResult>((res, rej) => {
    const results = Array<BrowserFinderResult>(finderCount)
    const resolved = Array<boolean | undefined>(finderCount)

    finders.forEach((finderName, index) => {
      const finder = finderMap[finderName]

      finder(normalizedOpts)
        .then((ret) => {
          debugBrowserFinder(`Found ${finderName}: %o`, ret)
          results[index] = ret
          resolved[index] = true
        })
        .catch((e) => {
          debugBrowserFinder(`Finder ${finderName} was failed: %o`, e)
          resolved[index] = false
        })
        .finally(() => {
          let target: number | undefined

          for (let i = finderCount - 1; i >= 0; i -= 1) {
            if (resolved[i] !== false) target = i
          }

          if (target === undefined) {
            rej(
              new CLIError(
                `No suitable browser found. Please ensure one of the following browsers is installed: ${finders.join(', ')}`,
                CLIErrorCode.NOT_FOUND_BROWSER
              )
            )
          } else if (resolved[target]) {
            res(results[target])
          }
        })
    })
  }).then((result) => {
    debugBrowserFinder('Use browser: %o', result)
    return result
  })
}

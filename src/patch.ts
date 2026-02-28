import module from 'node:module'
import { isStandaloneBinary } from './utils/binary'
import { debug } from './utils/debug'

export const patch = () => {
  patchSegmenter()
  enableCompileCache()
}

export const enableCompileCache = () => {
  try {
    // enableCompileCache() is available only in Node.js 22.8.0 and later
    ;(module as any).enableCompileCache?.()
  } catch {
    // no ops
  }
}

export const patchSegmenter = () => {
  // Avoid SEGFAULT in the standalone binary. pkg is using a Node.js build with small ICU.
  // https://github.com/nodejs/node/issues/51752
  if (isStandaloneBinary() && process.config.variables['icu_small']) {
    debug('Using a polyfilled implementation for Intl.Segmenter.')
    require('@formatjs/intl-segmenter/polyfill-force.js') // eslint-disable-line @typescript-eslint/no-require-imports
  }
}

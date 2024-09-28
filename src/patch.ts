import { isStandaloneBinary } from './utils/binary'
import { debug } from './utils/debug'

export const patch = () => {
  patchSegmentor()
}

export const patchSegmentor = () => {
  // Avoid SEGFAULT in the standalone binary. pkg is using a Node.js build with small ICU.
  // https://github.com/nodejs/node/issues/51752
  if (isStandaloneBinary() && process.config.variables['icu_small']) {
    debug('Using a polyfilled implementation for Intl.Segmenter.')
    require('@formatjs/intl-segmenter/polyfill-force')
  }
}

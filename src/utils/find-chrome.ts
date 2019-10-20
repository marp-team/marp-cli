import * as chromeFinder from 'chrome-launcher/dist/chrome-finder'

let cachedPath: string | undefined | false = false

export default function findChrome() {
  if (cachedPath === false) {
    const finder: (() => string[]) | undefined = (() => {
      // Use already known path within Marp CLI official Docker image
      if (process.env.IS_DOCKER) return () => ['/usr/bin/chromium-browser']

      // Use Chrome installed to Windows within WSL
      if (require('is-wsl')) return chromeFinder.wsl

      return chromeFinder[process.platform]
    })()

    cachedPath = finder ? finder()[0] : undefined
  }
  return cachedPath
}

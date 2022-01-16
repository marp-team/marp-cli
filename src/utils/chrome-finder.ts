import {
  darwinFast,
  linux,
  win32,
  wsl,
} from 'chrome-launcher/dist/chrome-finder'
import { isWSL } from './wsl'

// A lightweight version of Launcher.getFirstInstallation()
// https://github.com/GoogleChrome/chrome-launcher/blob/30755cde8627b7aad6caff1594c9752f80a39a4d/src/chrome-launcher.ts#L189-L192
export const findChromeInstallation = () => {
  // 'wsl' platform will resolve Chrome from Windows. In WSL 2, Puppeteer cannot
  // communicate with Chrome spawned in the host OS so should follow the
  // original platform ('linux') if CLI was executed in WSL 2.
  const platform = isWSL() === 1 ? 'wsl' : process.platform

  const installations = (() => {
    switch (platform) {
      /* istanbul ignore next: CI is not testing against darwin */
      case 'darwin':
        return [darwinFast()]
      case 'linux':
        return linux()
      case 'win32':
        return win32()
      /* istanbul ignore next: CI cannot test against WSL environment */
      case 'wsl':
        return wsl()
    }
    /* istanbul ignore next */
    return []
  })()

  return installations[0]
}

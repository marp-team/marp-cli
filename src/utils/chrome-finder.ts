import {
  darwinFast,
  linux,
  win32,
  wsl,
} from 'chrome-launcher/dist/chrome-finder'
import { isWSL } from './wsl'

// A lightweight version of Launcher.getFirstInstallation()
// https://github.com/GoogleChrome/chrome-launcher/blob/master/src/chrome-launcher.ts#L175
export const findChromeInstallation = () => {
  const platform = isWSL() ? 'wsl' : process.platform
  const installations = (() => {
    switch (platform) {
      case 'darwin':
        return [darwinFast()]
      case 'linux':
        return linux()
      case 'win32':
        return win32()
      case 'wsl':
        return wsl()
    }
    return []
  })()

  return installations[0]
}

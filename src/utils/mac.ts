import os from 'node:os'

export const shouldUseLiquidGlass = () => {
  if (process.platform !== 'darwin') return false

  const majorVersion = parseInt(os.release().split('.')[0], 10)
  return majorVersion >= 25 // macOS Tahoe 26 and later
}

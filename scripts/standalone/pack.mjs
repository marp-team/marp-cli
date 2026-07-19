import fs from 'node:fs/promises'
import { packDarwinArm64 } from './pack/darwin.mjs'
import { packLinuxArm64, packLinuxX64 } from './pack/linux.mjs'
import { packWindowsX64 } from './pack/win32.mjs'
import { distDir, binaryPath } from './utils/path.mjs'

try {
  await fs.access(binaryPath, fs.constants.R_OK)
} catch {
  console.error(`Binary file not found at "${binaryPath}".`)
  process.exit(1)
}

console.error('Packaging binary file...')

await fs.rm(distDir, { recursive: true, force: true })
await fs.mkdir(distDir, { recursive: true })

const outputPath = await (async () => {
  switch (process.platform) {
    case 'darwin':
      if (process.arch === 'arm64') return await packDarwinArm64(binaryPath)
      return null
    case 'linux':
      if (process.arch === 'arm64') return await packLinuxArm64(binaryPath)
      if (process.arch === 'x64') return await packLinuxX64(binaryPath)
      return null
    case 'win32':
      if (process.arch === 'x64') return await packWindowsX64(binaryPath)
      return null
  }
})()

if (!outputPath) {
  console.error(
    `Unsupported platform & architecture: ${process.platform}-${process.arch}`
  )
  process.exit(1)
} else {
  console.log(outputPath)
}

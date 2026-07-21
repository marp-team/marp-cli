import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { binDir, root } from './utils/path.mjs'
import { run } from './utils/run.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// --- Build the standalone binary

await fs.rm(binDir, { recursive: true, force: true })

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marp-cli-pkg-'))

try {
  const nodePath = await prepareNode()

  await run(nodePath, [path.join(__dirname, 'pkg.mjs')], {
    cwd: root,
    env: {
      ...process.env,
      MARP_CLI_PKG_NODE_PATH: nodePath,
      MARP_CLI_PKG_OPTIMIZED: '1',
    },
  })
} finally {
  await fs.rm(tmpDir, { recursive: true, force: true })
}

// --- Functions

async function prepareNode() {
  const [major] = process.versions.node.split('.')
  if (Number.parseInt(major, 10) < 26)
    throw new Error(
      'Node.js v26 or later is required to build standalone binaries.'
    )

  const tmpNode = path.join(
    tmpDir,
    `node${process.platform === 'win32' ? '.exe' : ''}`
  )

  await fs.copyFile(process.execPath, tmpNode)

  // Prebuild patch for the Node.js binary
  switch (process.platform) {
    case 'darwin':
      // Strip local symbols and re-sign the binary
      await run('strip', ['-S', '-x', tmpNode])
      await run('codesign', ['--force', '--sign', '-', tmpNode])
      break
    case 'linux':
      // Strip unneeded symbols
      await run('strip', ['--strip-unneeded', tmpNode])
  }

  return tmpNode
}

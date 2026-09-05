import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from '@yao-pkg/pkg'
import config from '../../pkg.config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const binDir = path.join(root, 'bin')

if (
  !process.env.MARP_CLI_PKG_NODE_PATH ||
  (await fs.realpath(process.execPath)) !==
    (await fs.realpath(process.env.MARP_CLI_PKG_NODE_PATH))
) {
  throw new Error('pkg.mjs should be executed by build.mjs')
}

let useLocalNodeRead = false

await exec({
  ...config,
  input: root,
  output: path.join(
    binDir,
    `marp${process.platform === 'win32' ? '.exe' : ''}`
  ),
  outputPath: undefined,
  preBuild: () => {
    if (!useLocalNodeRead) {
      throw new Error(
        'The @yao-pkg/pkg useLocalNode patch has not been applied'
      )
    }
  },
  get useLocalNode() {
    useLocalNodeRead = true
    return true
  },
})

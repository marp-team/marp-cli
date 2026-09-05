import path from 'node:path'
import { fileURLToPath } from 'node:url'
import packageJson from '../../../package.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const root = path.resolve(__dirname, '../../..')
export const binDir = path.join(root, 'bin')
export const binaryPath = path.join(
  binDir,
  `marp${process.platform === 'win32' ? '.exe' : ''}`
)
export const distDir = path.join(root, 'dist')
export const getPackagePath = ({ extension, suffix = '' }) =>
  path.join(
    distDir,
    `marp-cli-v${packageJson.version}${suffix ? `-${suffix.replace(/^-/, '')}` : ''}.${extension.replace(/^\./, '')}`
  )

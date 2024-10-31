/* Pack built standalone binaries for release. */

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import tar from 'tar-stream'
import ZipStream from 'zip-stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { version } = require('../package.json')

const bin = path.resolve(__dirname, '../bin')
const binaryName = 'marp'
const dist = path.resolve(__dirname, '../dist')
const prefix = `marp-cli-v${version}`
const os = (process.env.MATRIX_OS || 'linux,macos,windows').toLowerCase()

const packToTarGz = (binary) => {
  const pack = tar.pack()

  pack.entry({ name: binaryName, mode: 0o755 }, binary)
  pack.finalize()

  return pack.pipe(zlib.createGzip())
}

// Clean up dist directory
fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist)

// Create package for Linux (.tar.gz)
if (os.includes('linux') || os.includes('ubuntu')) {
  fs.readFile(path.resolve(bin, 'marp-cli-linux'), (err, buffer) => {
    if (err) throw err

    packToTarGz(buffer).pipe(
      fs.createWriteStream(path.resolve(dist, `${prefix}-linux.tar.gz`))
    )
  })
}

// Create package for macOS (.tar.gz)
if (os.includes('macos')) {
  fs.readFile(path.resolve(bin, 'marp-cli-macos'), (err, buffer) => {
    if (err) throw err

    packToTarGz(buffer).pipe(
      fs.createWriteStream(path.resolve(dist, `${prefix}-mac.tar.gz`))
    )
  })
}

// Create package for Windows (.zip)
if (os.includes('windows')) {
  fs.readFile(path.resolve(bin, 'marp-cli-win.exe'), (err, buffer) => {
    if (err) throw err

    const pack = new ZipStream()

    pack.entry(buffer, { name: `${binaryName}.exe` })
    pack.finalize()
    pack.pipe(fs.createWriteStream(path.resolve(dist, `${prefix}-win.zip`)))
  })
}

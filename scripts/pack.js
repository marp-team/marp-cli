/* Pack built standalone binaries for release. */

const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const tar = require('tar-stream')
const ZipStream = require('zip-stream')
const zlib = require('zlib')
const { version } = require('../package.json')

const bin = path.resolve(__dirname, '../bin')
const binaryName = 'marp'
const dist = path.resolve(__dirname, '../dist')
const prefix = `marp-cli-v${version}`
const target = (process.env.TARGET || 'linux,mac,win').toLowerCase()

const packToTarGz = binary => {
  const pack = tar.pack()

  pack.entry({ name: binaryName, mode: 0755 }, binary)
  pack.finalize()

  return pack.pipe(zlib.createGzip())
}

// Clean up dist directory
rimraf.sync(dist)
fs.mkdirSync(dist)

// Create package for Linux (.tar.gz)
if (target.includes('linux')) {
  fs.readFile(path.resolve(bin, 'marp-cli-linux'), (err, buffer) => {
    if (err) throw err

    packToTarGz(buffer).pipe(
      fs.createWriteStream(path.resolve(dist, `${prefix}-linux.tar.gz`))
    )
  })
}

// Create package for macOS (.tar.gz)
if (target.includes('mac')) {
  fs.readFile(path.resolve(bin, 'marp-cli-macos'), (err, buffer) => {
    if (err) throw err

    packToTarGz(buffer).pipe(
      fs.createWriteStream(path.resolve(dist, `${prefix}-mac.tar.gz`))
    )
  })
}

// Create package for Windows (.zip)
if (target.includes('win')) {
  fs.readFile(path.resolve(bin, 'marp-cli-win.exe'), (err, buffer) => {
    if (err) throw err

    const pack = new ZipStream()

    pack.entry(buffer, { name: `${binaryName}.exe` })
    pack.finalize()
    pack.pipe(fs.createWriteStream(path.resolve(dist, `${prefix}-win.zip`)))
  })
}

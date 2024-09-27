/* For baking the ICU data into the standalone binary, we need to download the compatible ICU data from the ICU repository. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import yauzl from 'yauzl'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const icuDir = path.join(__dirname, '../tmp/icu')
await fs.promises.mkdir(icuDir, { recursive: true })

const zipFromBuffer = promisify(yauzl.fromBuffer)

// Get the ICU version and endianness
const [icuMajor, icuMinor] = process.versions.icu.split('.')
const icuEndianness = process.config.variables.icu_endianness.toLowerCase()

// Download the ICU data
const response = await fetch(
  `https://github.com/unicode-org/icu/releases/download/release-${icuMajor}-${icuMinor}/icu4c-${icuMajor}_${icuMinor}-data-bin-${icuEndianness}.zip`
)

if (!response.ok) {
  throw new Error(`Failed to download ICU data: ${response.statusText}`)
}

// Extract the ICU data
const zip = await zipFromBuffer(Buffer.from(await response.arrayBuffer()), {
  lazyEntries: true,
})

const icuDat = await new Promise((res, rej) => {
  zip.on('error', (err) => rej(err))
  zip.on('entry', async (entry) => {
    if (/icudt\d+.\.dat/.test(entry.fileName)) {
      zip.openReadStream(entry, (err, readStream) => {
        if (err) return rej(err)

        const output = path.join(icuDir, entry.fileName)

        readStream.pipe(fs.createWriteStream(output))
        res(output)
      })
    } else {
      zip.readEntry()
    }
  })
  zip.on('end', () => rej(new Error('Failed to find ICU data in the archive')))
  zip.readEntry()
})

// Print the relative path to the ICU data from the project root
console.log(path.relative(path.join(__dirname, '../'), icuDat))

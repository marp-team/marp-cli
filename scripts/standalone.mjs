import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from '@yao-pkg/pkg'
import { fetchIcu } from './icu.mjs'

// Clean up bin directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const binDir = path.join(__dirname, '../bin')

await fs.promises.rm(binDir, { recursive: true, force: true })

// Fetch the ICU data
const icuDat = await fetchIcu()

// Run pkg
await exec([
  '--options',
  `icu-data-dir=${icuDat}`,
  '-C',
  'gzip',
  '--out-path',
  binDir,
  path.join(__dirname, '../'),
])

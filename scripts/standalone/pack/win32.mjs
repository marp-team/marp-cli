import path from 'node:path'
import { getPackagePath } from '../utils/path.mjs'
import { run } from '../utils/run.mjs'

const packagePath = getPackagePath({
  suffix: 'win',
  extension: '.zip',
})

export const packWindowsX64 = async (bin) => {
  await run('tar', [
    '-cf',
    packagePath,
    '--format=zip',
    '--options',
    'zip:compression-level=9',
    '-C',
    path.dirname(bin),
    path.basename(bin),
  ])

  return packagePath
}

import path from 'node:path'
import { getPackagePath } from '../utils/path.mjs'
import { run } from '../utils/run.mjs'

const packagePath = getPackagePath({
  suffix: 'mac',
  extension: '.tar.gz',
})

export const packDarwinArm64 = async (bin) => {
  await run('tar', [
    '-zcf',
    packagePath,
    '--options',
    'gzip:compression-level=9,gzip:!timestamp',
    '-C',
    path.dirname(bin),
    path.basename(bin),
  ])

  return packagePath
}

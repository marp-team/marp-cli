import path from 'node:path'
import { getPackagePath } from '../utils/path.mjs'
import { run } from '../utils/run.mjs'

const packagePathX64 = getPackagePath({
  suffix: 'linux',
  extension: '.tar.gz',
})

const packagePathArm64 = getPackagePath({
  suffix: 'linux-arm64',
  extension: '.tar.gz',
})

const packLinux = async (bin, packagePath) => {
  await run('tar', [
    '-cf',
    packagePath,
    '-I',
    'gzip -9 -n', // TODO: Use `.tar.xz` in future (`xz -9`)
    '-C',
    path.dirname(bin),
    path.basename(bin),
  ])

  return packagePath
}

export const packLinuxX64 = async (bin) => {
  return await packLinux(bin, packagePathX64)
}

export const packLinuxArm64 = async (bin) => {
  return await packLinux(bin, packagePathArm64)
}

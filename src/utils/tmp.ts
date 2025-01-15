import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { tmpName } from 'tmp'
import { isOfficialContainerImage } from './container'

const tmpNamePromise = promisify(tmpName)

// Snapd Chromium cannot access from sandbox container to user-land `/tmp`
// directory so always create tmp file to home directory if in Linux.
// (Except an official docker image)
const shouldPutTmpFileToHome =
  process.platform === 'linux' && !isOfficialContainerImage()

export const generateTmpName = async (extension?: `.${string}`) => {
  let tmp: string = await tmpNamePromise({ postfix: extension })
  if (shouldPutTmpFileToHome) tmp = path.join(os.homedir(), path.basename(tmp))

  return tmp
}

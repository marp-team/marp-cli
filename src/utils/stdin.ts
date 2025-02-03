import streamConsumers from 'node:stream/consumers'
import { setTimeout as setTimeoutPromise } from 'node:timers/promises'
import chalk from 'chalk'
import { info } from '../cli'
import { debug } from './debug'

const STDIN_NOTICE_DELAY = 3000

export const getStdin = async (): Promise<Buffer> => {
  if (process.stdin.isTTY) return Buffer.alloc(0)

  const delayedNoticeController = new AbortController()

  setTimeoutPromise(STDIN_NOTICE_DELAY, null, {
    ref: false,
    signal: delayedNoticeController.signal,
  })
    .then(() => {
      info(
        `Currently waiting data from stdin stream. Conversion will start after finished reading. (Pass ${chalk.yellow`--no-stdin`} option if it was not intended)`
      )
    })
    .catch(() => {
      // No ops
    })

  debug('Reading stdin stream...')
  const buf = await streamConsumers.buffer(process.stdin)

  debug('Read from stdin: %d bytes', buf.length)
  delayedNoticeController.abort()

  return buf
}

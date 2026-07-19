import { spawn } from 'node:child_process'

export const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            signal
              ? `"${command}" was terminated by ${signal}`
              : `"${command}" exited with code ${code}`
          )
        )
      }
    })
  })

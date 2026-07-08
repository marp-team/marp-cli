import module from 'node:module'

export const patcher = {
  patch: () => {
    patcher.enableCompileCache()
  },
  enableCompileCache: () => {
    try {
      // enableCompileCache() is available only in Node.js 22.8.0 and later
      ;(module as any).enableCompileCache?.()
    } catch {
      // no ops
    }
  },
}

export const patch = () => patcher.patch()

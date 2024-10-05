import { promises as fs } from 'node:fs'
import path from 'node:path'
import { packageUp } from 'package-up'
import Pug from 'pug'

// https://gist.github.com/mnpenner/d201118e498172cfa8be69a646d0ece4
export const pug = ({ debug = false } = {}) => ({
  name: 'pug',
  async load(absPath) {
    if (!absPath.endsWith('.pug')) return null

    const source = await fs.readFile(absPath, 'utf8')
    const filename = path.relative(path.join(await packageUp(), '../'), absPath)

    const fn = Pug.compile(source, {
      filename,
      inlineRuntimeFunctions: false,
      compileDebug: !!debug,
      debug: false,
      pretty: false,
    })

    for (const dep of fn.dependencies) {
      this.addWatchFile(dep)
    }

    return {
      code: `import pug from 'pug-runtime';\n${fn};\nexport default template;`,
      moduleSideEffects: false,
    }
  },
})

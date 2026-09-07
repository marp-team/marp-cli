import { promises as fs } from 'node:fs'
import path from 'node:path'
import { packageUp } from 'package-up'
import Pug from 'pug'
import type { Rolldown } from 'tsdown'

// https://gist.github.com/mnpenner/d201118e498172cfa8be69a646d0ece4
export const pug = ({ debug = false } = {}): Rolldown.Plugin => ({
  name: 'pug',
  async load(absPath) {
    if (!absPath.endsWith('.pug')) return null

    this.addWatchFile(absPath)
    const source = await fs.readFile(absPath, 'utf8')
    const packagePath = await packageUp()
    if (!packagePath)
      this.error('Cannot find package.json for the Pug template.')
    const filename = path.relative(path.dirname(packagePath), absPath)

    const { body, dependencies } = Pug.compileClientWithDependenciesTracked(
      source,
      {
        filename,
        inlineRuntimeFunctions: false,
        compileDebug: !!debug,
        debug: false,
        pretty: false,
      }
    )

    for (const dep of dependencies) {
      this.addWatchFile(dep)
    }

    return {
      code: `import pug from 'pug-runtime';\n${body};\nexport default template;`,
      moduleSideEffects: false,
    }
  },
})

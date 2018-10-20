import { Marpit } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import pkgUp from 'pkg-up'
import promisify from 'util.promisify'
import importFrom from 'import-from'
import { CLIError } from './error'

const readFile = promisify(fs.readFile)

export type Engine = typeof Marpit
export type ResolvableEngine = Engine | string

export class ResolvedEngine {
  browserScript?: string
  klass: Engine

  private static browserScriptKey = 'marpBrowser'

  static async resolve(
    engine: ResolvableEngine | ResolvableEngine[],
    from?: string
  ): Promise<ResolvedEngine> {
    const resolvedEngine = new ResolvedEngine(
      ResolvedEngine.resolveModule(engine, from)
    )

    await resolvedEngine.resolveBrowserScript()
    return resolvedEngine
  }

  private static resolveModule(
    engine: ResolvableEngine | ResolvableEngine[],
    from?: string
  ) {
    let resolved
    ;(Array.isArray(engine) ? engine : [engine]).some(eng => {
      if (typeof eng === 'string') {
        resolved =
          (from && importFrom.silent(path.dirname(path.resolve(from)), eng)) ||
          importFrom.silent(process.cwd(), eng)

        if (resolved && resolved.__esModule) resolved = resolved.default
      } else {
        resolved = eng
      }
      return resolved
    })

    if (!resolved) throw new CLIError(`The specified engine has not resolved.`)
    return resolved
  }

  private constructor(klass: Engine) {
    this.klass = klass
  }

  private async resolveBrowserScript(): Promise<void> {
    const classPath = this.findClassPath(this.klass)
    if (!classPath) return

    const pkgPath = await pkgUp(path.dirname(classPath))
    if (!pkgPath) return

    const scriptPath = require(pkgPath)[ResolvedEngine.browserScriptKey]
    if (!scriptPath) return undefined

    this.browserScript = (await readFile(
      path.resolve(path.dirname(pkgPath), scriptPath)
    )).toString()
  }

  // NOTE: It cannot test because of overriding `require` in Jest context.
  private findClassPath(klass) {
    for (const moduleId in require.cache) {
      const expt = require.cache[moduleId].exports

      if (
        expt === klass ||
        (expt && expt.__esModule && Object.values(expt).includes(klass))
      )
        return moduleId
    }
    return undefined
  }
}

export default ResolvedEngine.resolve

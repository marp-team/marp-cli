import { Marpit } from '@marp-team/marpit'
import fs from 'fs'
import path from 'path'
import pkgUp from 'pkg-up'
import importFrom from 'import-from'
import { CLIError } from './error'

export type Engine = typeof Marpit
export type ResolvableEngine = Engine | string

export class ResolvedEngine {
  browserScript?: string
  klass: Engine

  private static browserScriptKey = 'marpBrowser'

  static async resolve(
    engine: ResolvableEngine,
    from?: string
  ): Promise<ResolvedEngine> {
    const resolvedEngine = new ResolvedEngine(
      typeof engine === 'string'
        ? ResolvedEngine.resolveModule(engine, from)
        : engine
    )

    await resolvedEngine.resolveBrowserScript()
    return resolvedEngine
  }

  private static resolveModule(moduleId: string, from?: string) {
    try {
      const resolved =
        (from &&
          importFrom.silent(path.dirname(path.resolve(from)), moduleId)) ||
        importFrom(process.cwd(), moduleId)

      return resolved && resolved.__esModule ? resolved.default : resolved
    } catch (e) {
      throw new CLIError(
        `The specified engine "${moduleId}" has not resolved. (${e.message})`
      )
    }
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

    this.browserScript = await new Promise<string>((res, rej) =>
      fs.readFile(
        path.resolve(path.dirname(pkgPath), scriptPath),
        (e, buf) => (e ? rej(e) : res(buf.toString()))
      )
    )
  }

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

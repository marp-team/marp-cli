import path from 'path'
import { Marpit } from '@marp-team/marpit'
import importFrom from 'import-from'
import { pkgUp } from 'pkg-up'
import { error } from './error'

export type Engine = typeof Marpit
export type ResolvableEngine = Engine | DelayedEngineResolver | string

const delayedEngineResolverSymbol = Symbol('delayedEngineResolver')

type DelayedEngineResolver = {
  [delayedEngineResolverSymbol]: () => Promise<Engine>
}

const delayedEngineResolver = (
  fn: () => Promise<Engine>
): DelayedEngineResolver => ({ [delayedEngineResolverSymbol]: fn })

export class ResolvedEngine {
  klass: Engine

  private _cachedPackage?: Record<string, any> | null

  private static _defaultEngine: ResolvedEngine | undefined

  static async resolve(
    engine: ResolvableEngine | ResolvableEngine[],
    from?: string
  ): Promise<ResolvedEngine> {
    return new ResolvedEngine(await ResolvedEngine.resolveModule(engine, from))
  }

  static async resolveDefaultEngine(): Promise<ResolvedEngine> {
    if (
      ResolvedEngine._defaultEngine === undefined ||
      process.env.NODE_ENV === 'test'
    ) {
      ResolvedEngine._defaultEngine = await ResolvedEngine.resolve([
        '@marp-team/marp-core', // Manually-installed Marp Core

        // Bundled Marp Core
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- import statement brings segmentation fault: https://github.com/marp-team/marp-cli/issues/487
        delayedEngineResolver(async () => require('@marp-team/marp-core').Marp),
      ])
    }
    return ResolvedEngine._defaultEngine
  }

  async getPackage() {
    if (this._cachedPackage === undefined) {
      this._cachedPackage = await this.resolvePackage()
    }
    return this._cachedPackage
  }

  private static async resolveModule(
    engine: ResolvableEngine | ResolvableEngine[],
    from?: string
  ) {
    let resolved

    for (const eng of ([] as ResolvableEngine[]).concat(engine)) {
      if (typeof eng === 'string') {
        resolved =
          (from && importFrom.silent(path.dirname(path.resolve(from)), eng)) ||
          importFrom.silent(process.cwd(), eng)

        if (resolved && typeof resolved === 'object' && 'default' in resolved) {
          resolved = resolved.default
        }
      } else if (typeof eng === 'object' && eng[delayedEngineResolverSymbol]) {
        resolved = await eng[delayedEngineResolverSymbol]()
      } else {
        resolved = eng
      }

      if (resolved) break
    }

    if (!resolved) error(`The specified engine has not resolved.`)
    return resolved
  }

  private constructor(klass: Engine) {
    this.klass = klass
  }

  private async resolvePackage() {
    const classPath = this.findClassPath(this.klass)
    if (!classPath) return null

    const pkgPath = await pkgUp({ cwd: path.dirname(classPath) })
    if (!pkgPath) return null

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(pkgPath) as Record<string, any>
  }

  // NOTE: It cannot test because of overriding `require` in Jest context.
  /* c8 ignore start */
  private findClassPath(klass) {
    for (const moduleId in require.cache) {
      const expt = require.cache[moduleId]?.exports

      if (
        expt === klass ||
        (expt &&
          typeof expt === 'object' &&
          Object.values(expt).includes(klass))
      )
        return moduleId
    }
    return undefined
  }
  /* c8 ignore stop */
}

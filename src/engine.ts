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
  package?: Record<string, any>

  private static _defaultEngine: ResolvedEngine | undefined

  static async resolve(
    engine: ResolvableEngine | ResolvableEngine[],
    from?: string
  ): Promise<ResolvedEngine> {
    const resolvedEngine = new ResolvedEngine(
      await ResolvedEngine.resolveModule(engine, from)
    )

    await resolvedEngine.resolvePackage()
    return resolvedEngine
  }

  static async resolveDefaultEngine(): Promise<ResolvedEngine> {
    if (
      ResolvedEngine._defaultEngine === undefined ||
      process.env.NODE_ENV === 'test'
    ) {
      ResolvedEngine._defaultEngine = await ResolvedEngine.resolve([
        '@marp-team/marp-core',
        delayedEngineResolver(
          async () => (await import('@marp-team/marp-core')).Marp
        ),
      ])
    }
    return ResolvedEngine._defaultEngine
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

        if (resolved?.__esModule) resolved = resolved.default
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

  private async resolvePackage(): Promise<void> {
    const classPath = this.findClassPath(this.klass)
    if (!classPath) return

    const pkgPath = await pkgUp({ cwd: path.dirname(classPath) })
    if (!pkgPath) return

    this.package = require(pkgPath)
  }

  // NOTE: It cannot test because of overriding `require` in Jest context.
  private findClassPath(klass) {
    for (const moduleId in require.cache) {
      const expt = require.cache[moduleId]?.exports

      if (
        expt === klass ||
        (expt?.__esModule && Object.values(expt).includes(klass))
      )
        return moduleId
    }
    return undefined
  }
}

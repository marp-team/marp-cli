import fs from 'fs'
import path from 'path'
import url from 'url'
import type { Marp } from '@marp-team/marp-core'
import { Marpit } from '@marp-team/marpit'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import { pkgUp } from 'pkg-up'
import { error } from './error'

/** @internal */
export const _silentImport = async <T = any>(
  moduleId: string,
  from?: string
): Promise<T | null> => {
  const basePath = path.join(from || process.cwd(), '_.js')
  const dirPath = path.dirname(basePath)
  const moduleFilePath = path.resolve(dirPath, moduleId)

  try {
    const stat = await fs.promises.stat(moduleFilePath)

    if (stat.isFile()) moduleId = url.pathToFileURL(moduleFilePath).toString()
  } catch (e: unknown) {
    // No ops
  }

  try {
    const resolved = await importMetaResolve(
      moduleId,
      url.pathToFileURL(basePath).toString()
    )

    // Try to import without `file:` protocol first
    if (resolved.startsWith('file:')) {
      try {
        return await import(url.fileURLToPath(resolved))

        // NOTE: Fallback cannot test because of overriding `import` in Jest context.
        /* c8 ignore start */
      } catch (e) {
        /* fallback */
      }
    }

    return await import(resolved)
    /* c8 ignore stop */
  } catch (e) {
    return null
  }
}

type MarpitInstanceOrClass = Marpit | typeof Marpit

export type Engine = MarpitInstanceOrClass | FunctionEngine

type FunctionEngine = (
  opts?: Marpit.Options
) => MarpitInstanceOrClass | Promise<MarpitInstanceOrClass>

export type ResolvableEngine = Engine | string

const preResolveAsyncSymbol = Symbol('preResolveAsync')

export class ResolvedEngine<T extends Engine = Engine> {
  klass: T

  private _cachedPackage?: Record<string, any> | null

  private static _defaultEngine: ResolvedEngine<typeof Marp> | undefined

  static async resolve<T extends Engine = Engine>(
    engine: ResolvableEngine | ResolvableEngine[],
    from?: string
  ): Promise<ResolvedEngine<T>> {
    return new ResolvedEngine(await ResolvedEngine.resolveModule(engine, from))
  }

  static async resolveDefaultEngine(): Promise<ResolvedEngine<typeof Marp>> {
    if (
      ResolvedEngine._defaultEngine === undefined ||
      process.env.NODE_ENV === 'test'
    ) {
      ResolvedEngine._defaultEngine = await ResolvedEngine.resolve([
        // Manually-installed Marp Core
        '@marp-team/marp-core',

        // Bundled Marp Core
        Object.assign(
          () => import('@marp-team/marp-core').then(({ Marp }) => Marp),
          { [preResolveAsyncSymbol]: true }
        ),
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
          (from &&
            (await _silentImport(eng, path.dirname(path.resolve(from))))) ||
          (await _silentImport(eng))
      } else if (typeof eng === 'function' && eng[preResolveAsyncSymbol]) {
        resolved = await (eng as any)()
      } else {
        resolved = eng
      }

      // Resolve default export
      while (
        resolved &&
        typeof resolved === 'object' &&
        'default' in resolved &&
        resolved !== resolved.default
      ) {
        resolved = resolved.default
      }

      if (resolved) break
    }

    if (!resolved) error(`The specified engine has not resolved.`)
    return resolved
  }

  private constructor(klass: T) {
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

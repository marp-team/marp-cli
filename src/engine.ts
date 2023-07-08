import fs from 'fs'
import path from 'path'
import url from 'url'
import type { Marp } from '@marp-team/marp-core'
import { Marpit } from '@marp-team/marpit'
import importFrom from 'import-from'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import { pkgUp } from 'pkg-up'
import { error, isError } from './error'

type FunctionalEngine<T extends typeof Marpit = typeof Marpit> = (
  constructorOptions: ConstructorParameters<T>[0] & { readonly marp: Marp }
) => Marpit | typeof Marpit | Promise<Marpit | typeof Marpit>

export type Engine<T extends typeof Marpit = typeof Marpit> =
  | Marpit
  | typeof Marpit
  | FunctionalEngine<T>

export type ResolvableEngine<T extends typeof Marpit = typeof Marpit> =
  | Engine<T>
  | string

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
          // eslint-disable-next-line @typescript-eslint/no-var-requires -- import statement brings TypeError in the standalone binary
          () => Promise.resolve(require('@marp-team/marp-core').Marp),
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
            (await this._silentImportOrRequire(
              eng,
              path.dirname(path.resolve(from))
            ))) ||
          (await this._silentImportOrRequire(eng))
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

  static isESMAvailable() {
    // Standalone binary that is built by pkg cannot import ESM module.
    // https://github.com/vercel/pkg/issues/1291
    return !('pkg' in process)
  }

  private static async _silentImportOrRequire<T = any>(
    moduleId: string,
    from?: string
  ): Promise<T | null> {
    if (this.isESMAvailable()) return this._silentImport(moduleId, from)

    return this._silentRequire(moduleId, from)
  }

  private static async _silentImport<T = any>(
    moduleId: string,
    from?: string
  ): Promise<T | null> {
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
      const resolved = importMetaResolve(
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

  private static async _silentRequire<T = any>(
    moduleId: string,
    from?: string
  ): Promise<T | null> {
    try {
      const resolvedFrom = from
        ? path.dirname(path.resolve(from))
        : process.cwd()

      return importFrom(resolvedFrom, moduleId) as T | null

      /* c8 ignore start */
    } catch (e) {
      if (isError(e) && e.code === 'ERR_REQUIRE_ESM') {
        // Show reason why `require()` failed in the current context
        if ('pkg' in process) {
          error(
            'A standalone binary version of Marp CLI is currently not supported resolving ESM. Please consider using CommonJS, or trying to use Marp CLI via Node.js.'
          )
        }
      }
      return null // Jest allows importing ESM via `require()` so this line cannot measure coverage.
    }
    /* c8 ignore stop */
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

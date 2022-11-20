import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import url from '@rollup/plugin-url'
import builtinModules from 'builtin-modules'
import license from 'rollup-plugin-license'
import postcss from 'rollup-plugin-postcss'
import pugPlugin from 'rollup-plugin-pug'
import { terser } from 'rollup-plugin-terser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { dependencies, name, version } = require('./package.json')

const compact = !process.env.ROLLUP_WATCH

const external = (deps) => (id) =>
  deps.some((dep) => dep === id || id.startsWith(`${dep}/`))

const plugins = (opts = {}) => [
  json({ preferConst: true }),
  alias({
    entries: [
      { find: /^node:(.+)$/, replacement: '$1' },
      { find: 'jszip', replacement: 'jszip/dist/jszip.min.js' },
    ],
  }),
  nodeResolve({
    browser: !!opts.browser,
    exportConditions: opts.browser ? [] : ['node'],
    mainFields: ['module', 'jsnext:main', 'main'],
  }),
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
  commonjs(),
  typescript({ noEmitOnError: false }),
  postcss({ inject: false }),
  pugPlugin({ pugRuntime: 'pug-runtime' }),
  url({
    sourceDir: path.join(__dirname, 'lib'),
    limit: 30720,
  }),
  compact &&
    terser({
      keep_classnames: /^CLIError$/,
      format: { comments: opts.license ? /^!!/ : 'some' },
      ecma: 2019,
      compress: { passes: 2 },
    }),
  opts.license &&
    license({
      thirdParty: {
        output: path.join(__dirname, opts.license),
      },
    }),
]

const browser = (opts = {}) => ({
  external: external(Object.keys(dependencies)),
  plugins: plugins({ ...opts, browser: true }),
})

const cli = {
  external: external([...builtinModules, ...Object.keys(dependencies)]),
  plugins: plugins(),
}

export default [
  {
    ...browser({ license: 'lib/bespoke.js.LICENSE.txt' }),
    input: 'src/templates/bespoke.js',
    output: {
      compact,
      file: 'lib/bespoke.js',
      format: 'iife',
      banner: `/*!! License: https://unpkg.com/${name}@${version}/lib/bespoke.js.LICENSE.txt */\n`,
    },
  },
  {
    ...browser(),
    input: 'src/templates/watch.js',
    output: { compact, file: 'lib/watch.js', format: 'iife' },
  },
  {
    ...browser(),
    input: 'src/server/server-index.js',
    output: { compact, file: 'lib/server/server-index.js', format: 'iife' },
  },
  {
    ...cli,
    input: ['src/marp-cli.ts', 'src/index.ts'],
    output: { compact, dir: 'lib', exports: 'named', format: 'cjs' },
  },
]

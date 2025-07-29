import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import url from '@rollup/plugin-url'
import license from 'rollup-plugin-license'
import postcss from 'rollup-plugin-postcss'
import { pug } from './scripts/rollup-pug.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const { dependencies, name, version } = require('./package.json')
const external = (id) =>
  Object.keys(dependencies).some(
    (dep) => dep === id || id.startsWith(`${dep}/`)
  )

const compact = !process.env.ROLLUP_WATCH

const plugins = (opts = {}) => [
  json({ preferConst: true }),
  alias({
    entries: [{ find: 'jszip', replacement: 'jszip/dist/jszip.min.js' }],
  }),
  nodeResolve({
    browser: !!opts.browser,
    preferBuiltins: !opts.browser,
    exportConditions: opts.browser ? [] : ['node'],
  }),
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
  commonjs(),
  typescript({ noEmitOnError: false }),
  postcss({ inject: false }),
  pug(),
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
  external,
  plugins: plugins({ ...opts, browser: true }),
})

const cli = { external, plugins: plugins() }

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
    input: [
      'src/index.ts', // Node.js entrypoint
      'src/marp-cli.ts', // CLI entrypoint
      'src/patch.ts', // CLI patch
      'src/prepare.ts', // CLI preparation
    ],
    output: {
      compact,
      dir: 'lib',
      exports: 'named',
      format: 'cjs',
      dynamicImportInCjs: false, // Required to avoid using `import()` that is incompatible with standalone binary
    },
  },
]

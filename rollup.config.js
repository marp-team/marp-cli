import path from 'path'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import url from '@rollup/plugin-url'
import autoprefixer from 'autoprefixer'
import builtinModules from 'builtin-modules'
import cssnano from 'cssnano'
import postcssUrl from 'postcss-url'
import license from 'rollup-plugin-license'
import postcss from 'rollup-plugin-postcss'
import pugPlugin from 'rollup-plugin-pug'
import { terser } from 'rollup-plugin-terser'
import { dependencies, name, version } from './package.json'

const compact = !process.env.ROLLUP_WATCH

const external = (deps) => (id) =>
  deps.some((dep) => dep === id || id.startsWith(`${dep}/`))

const plugins = (opts = {}) => [
  json({ preferConst: true }),
  nodeResolve({
    browser: !!opts.browser,
    mainFields: ['module', 'jsnext:main', 'main'],
  }),
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
  commonjs(),
  typescript({ noEmitOnError: false }),
  alias({
    entries: [{ find: /^node:(.+)$/, replacement: '$1' }],
  }),
  postcss({
    inject: false,
    plugins: [
      postcssUrl({
        filter: '**/assets/**/*.svg',
        encodeType: 'base64',
        url: 'inline',
      }),
      autoprefixer(),
      cssnano({ preset: 'default' }),
    ],
  }),
  pugPlugin({ pugRuntime: 'pug-runtime' }),
  url({ sourceDir: path.join(__dirname, 'lib') }),
  compact &&
    terser({
      keep_classnames: /^CLIError$/,
      format: { comments: opts.license ? /^!!/ : 'some' },
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

import autoprefixer from 'autoprefixer'
import builtinModules from 'builtin-modules'
import cssnano from 'cssnano'
import path from 'path'
import postcssUrl from 'postcss-url'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
import pugPlugin from 'rollup-plugin-pug'
import replace from 'rollup-plugin-replace'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript'
import url from 'rollup-plugin-url'
import { dependencies } from './package.json'

const external = [
  ...Object.keys(dependencies),
  'chrome-launcher/dist/chrome-finder',
  'yargs/yargs',
]

const plugins = (opts = {}) => [
  json({ preferConst: true }),
  nodeResolve({
    browser: !!opts.browser,
    mainFields: ['module', 'jsnext:main', 'main'],
  }),
  replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
  commonjs(),
  typescript({ resolveJsonModule: false }),
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
  !process.env.ROLLUP_WATCH && terser(),
]

const browser = {
  external,
  plugins: plugins({ browser: true }),
}

const cli = {
  external: [...builtinModules, ...external],
  plugins: plugins(),
}

export default [
  {
    ...browser,
    input: 'src/templates/bespoke.js',
    output: { file: 'lib/bespoke.js', format: 'iife' },
  },
  {
    ...browser,
    input: 'src/templates/watch.js',
    output: { file: 'lib/watch.js', format: 'iife' },
  },
  {
    ...browser,
    input: 'src/server/server-index.js',
    output: { file: 'lib/server/server-index.js', format: 'iife' },
  },
  {
    ...cli,
    input: 'src/marp-cli.ts',
    output: { exports: 'named', file: 'lib/marp-cli.js', format: 'cjs' },
  },
]

import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
import pugPlugin from 'rollup-plugin-pug'
import typescriptPlugin from 'rollup-plugin-typescript'
import { uglify } from 'rollup-plugin-uglify'
import typescript from 'typescript'
import { minify } from 'uglify-es'
import { dependencies } from './package.json'

const external = [
  ...Object.keys(dependencies),
  'fs',
  'path',
  'chrome-launcher/dist/chrome-finder',
  'yargs/yargs',
]

const plugins = [
  json({ preferConst: true }),
  nodeResolve({ jsnext: true }),
  commonjs(),
  typescriptPlugin({
    resolveJsonModule: false, // JSON has already resolved by rollup-plugin-json
    typescript,
  }),
  postcss({
    inject: false,
    plugins: [autoprefixer(), cssnano({ preset: 'default' })],
  }),
  pugPlugin(),
  !process.env.ROLLUP_WATCH && uglify({}, minify),
]

export default [
  {
    external,
    plugins,
    input: 'src/templates/bespoke.js',
    output: { file: 'lib/bespoke.js', format: 'iife' },
  },
  {
    external,
    plugins,
    input: 'src/marp-cli.ts',
    output: { exports: 'named', file: 'lib/marp-cli.js', format: 'cjs' },
  },
]

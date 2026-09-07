import path from 'node:path'
import { fileURLToPath } from 'node:url'
import url from '@rollup/plugin-url'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'
import postcssUrl from 'postcss-url'
import license from 'rollup-plugin-license'
import { defineConfig } from 'tsdown'
import type { UserConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }
import { pug } from './scripts/rolldown-pug.mts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { dependencies, name, version } = packageJson

export default defineConfig((options) => {
  const base = {
    outDir: 'lib',
    dts: false,
    target: 'es2019',
    minify: !options.watch && {
      // CLIError must retain its class name in the public API.
      compress: { keepNames: { class: true, function: false } },
      mangle: { keepNames: { class: true, function: false } },
    },
    env: { NODE_ENV: 'production' },
    deps: { neverBundle: Object.keys(dependencies), onlyBundle: false },
    inputOptions: {
      resolve: {
        alias: {
          jszip: 'jszip/dist/jszip.min.js',
          'pdf-lib': 'pdf-lib/dist/pdf-lib.esm.js',
        },
      },
    },
  } as const satisfies UserConfig

  const browser = {
    ...base,
    platform: 'browser',
    format: 'iife',
    outputOptions: { entryFileNames: '[name].js' },
  } as const satisfies UserConfig

  return [
    {
      ...browser,
      entry: { bespoke: 'src/templates/bespoke.js' },
      banner: `/*!! License: https://unpkg.com/${name}@${version}/lib/bespoke.js.LICENSE.txt */`,
      plugins: [
        license({
          thirdParty: {
            output: path.join(__dirname, 'lib/bespoke.js.LICENSE.txt'),
          },
        }),
      ],
    },
    {
      ...browser,
      entry: { watch: 'src/templates/watch.js' },
    },
    {
      ...browser,
      entry: { 'server/server-index': 'src/server/server-index.js' },
    },
    {
      ...base,
      entry: [
        'src/index.ts',
        'src/marp-cli.ts',
        'src/patch.ts',
        'src/prepare.ts',
      ],
      platform: 'node',
      format: 'esm',
      dts: { entry: 'src/index.ts', resolver: 'tsc' },
      shims: true,
      outputOptions: { exports: 'named' },
      css: {
        target: false,
        transformer: 'postcss',
        postcss: {
          plugins: [
            postcssUrl({
              filter: '**/assets/**/*.svg',
              encodeType: 'base64',
              url: 'inline',
            }),
            autoprefixer(),
            cssnano({
              // Keep empty transition keyframes so their names can be detected.
              preset: ['default', { autoprefixer: false, discardEmpty: false }],
            }),
          ],
        },
      },
      plugins: [
        pug(),
        url({
          include: '**/mac-dock-*.png',
          limit: Number.POSITIVE_INFINITY, // Always inline the icon
        }),
        url({ sourceDir: path.join(__dirname, 'lib'), limit: 30720 }),
      ],
    },
  ] as const satisfies UserConfig[]
})

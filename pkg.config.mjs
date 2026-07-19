const optimized = !!process.env.MARP_CLI_PKG_OPTIMIZED
const debug = !!process.env.MARP_CLI_PKG_DEBUG
const compress = process.env.MARP_CLI_PKG_COMPRESS || 'Brotli'

export default {
  compress,
  outputPath: 'bin',
  scripts: 'lib/**/*.js',
  sea: true,
  targets: ['host'],
  debug,
  ...(optimized && {
    ignore: [
      '**/node_modules/**/typescript/**',
      '**/*.map',
      '**/*.ts',
      '**/{test,tests,__tests__}/**',
      '**/*.{test,spec}.*',
      '**/*.md',
      '**/mathjax-full/es5/**',
      `**/prebuilds/!(${process.platform}-${process.arch})/**/*.bare`,
    ],
  }),
}

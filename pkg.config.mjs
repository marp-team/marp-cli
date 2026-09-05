import { run } from './scripts/standalone/utils/run.mjs'
import { updateWindowsMetadata } from './scripts/standalone/win-meta.mjs'

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
  postBuild: async (bin) => {
    // Windows: Update resource metadata (icon, version info, etc.)
    if (process.platform === 'win32') await updateWindowsMetadata(bin)

    // Smoke test to check the binary is working
    await run(bin, ['-v'], { stdio: 'inherit' })
  },
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

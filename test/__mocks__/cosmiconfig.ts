const cosmiconfig: typeof import('cosmiconfig') =
  jest.requireActual('cosmiconfig')

const {
  cosmiconfig: originalCosmiconfig,
  defaultLoaders,
  defaultLoadersSync,
} = cosmiconfig

// Because of v8's bug, Jest fails with SIGSEGV if used dynamic import.
// When using ESM in tests, you have to set up Jest to transpile config files into CommonJS with Babel.
cosmiconfig.cosmiconfig = jest.fn((moduleName, options) => {
  return originalCosmiconfig(moduleName, {
    loaders: {
      // cosmiconfig sync loader is using `require()` to load JS
      ...defaultLoaders,
      '.js': defaultLoadersSync['.js'],
      '.mjs': defaultLoadersSync['.js'],
      '.cjs': defaultLoadersSync['.js'],
      '.ts': defaultLoadersSync['.ts'],
    },
    ...(options ?? {}),
  })
})

module.exports = cosmiconfig

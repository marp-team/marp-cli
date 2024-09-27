const { createJsWithBabelPreset } = require('ts-jest')

const jsWithBabel = createJsWithBabelPreset()

const esModules = [
  '@sindresorhus/merge-streams',
  'ansi-regex',
  'array-union',
  'chalk',
  'chrome-launcher',
  'find-up',
  'globby',
  'import-meta-resolve',
  'is-docker',
  'is-inside-container',
  'is-wsl',
  'lighthouse-logger',
  'locate-path',
  'nanoid',
  'os-locale',
  'p-limit',
  'p-locate',
  'path-exists',
  'path-type',
  'pkg-up',
  'slash',
  'strip-ansi',
  'unicorn-magic',
  'yocto-queue',
]

module.exports = {
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx'],
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],
  coverageProvider: 'v8',
  coverageThreshold: { global: { lines: 95 } },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  prettierPath: null,
  setupFiles: ['./jest.setup.js'],
  transform: {
    ...jsWithBabel.transform,
    '\\.s?css$': '<rootDir>/test/_transformers/css.js',
    '\\.png$': '<rootDir>/test/_transformers/png.js',
    '\\.pug$': '<rootDir>/test/_transformers/pug.js',
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules.join('|')})`],
  testEnvironment: 'node',
  testRegex: '(/(test|__tests__)/(?![_.]).*|(\\.|/)(test|spec))\\.[jt]sx?$',
}

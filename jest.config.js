const { jsWithBabel } = require('ts-jest/presets')

const esModules = [
  'ansi-regex',
  'array-union',
  'chalk',
  'find-up',
  'globby',
  'is-docker',
  'locate-path',
  'nanoid',
  'os-locale',
  'p-limit',
  'p-locate',
  'path-exists',
  'pkg-up',
  'slash',
  'strip-ansi',
  'yocto-queue',
]

module.exports = {
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx'],
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],
  coverageThreshold: { global: { lines: 95 } },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
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

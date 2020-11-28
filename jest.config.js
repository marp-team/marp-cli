const { defaults: tsjPreset } = require('ts-jest/presets')

module.exports = {
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx'],
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],
  coverageThreshold: { global: { lines: 95 } },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['./jest.setup.js'],
  transform: {
    ...tsjPreset.transform,
    '^.*\\.s?css$': '<rootDir>/test/_transformers/css.js',
    '^.*\\.png$': '<rootDir>/test/_transformers/png.js',
    '^.*\\.pug$': '<rootDir>/test/_transformers/pug.js',
  },
  testEnvironment: 'node',
  testRegex: '(/(test|__tests__)/(?![_.]).*|(\\.|/)(test|spec))\\.[jt]sx?$',
}

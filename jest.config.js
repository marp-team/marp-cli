module.exports = {
  collectCoverageFrom: ['src/**/*.{j,t}s'],
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],
  coverageThreshold: { global: { lines: 95 } },
  setupTestFrameworkScriptFile: '<rootDir>/jest.setup.ts',
  transform: {
    '^.*\\.ts$': 'ts-jest',
    '^.*\\.s?css$': '<rootDir>/test/_transformers/css.js',
    '^.*\\.pug$': '<rootDir>/test/_transformers/pug.js',
  },
  testEnvironment: 'node',
  testRegex: '(/(test|__tests__)/(?!_).*|(\\.|/)(test|spec))\\.[jt]s$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
}

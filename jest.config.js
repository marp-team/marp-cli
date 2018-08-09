module.exports = {
  collectCoverageFrom: ['src/**/*.{j,t}s'],
  coveragePathIgnorePatterns: ['/node_modules/', '.*\\.d\\.ts'],
  coverageThreshold: { global: { lines: 95 } },
  transform: { '^.*\\.ts$': 'ts-jest' },
  testRegex: '(/(test|__tests__)/(?!_).*|(\\.|/)(test|spec))\\.[jt]s$',
  testURL: 'http://localhost',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
}

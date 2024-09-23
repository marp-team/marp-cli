module.exports = {
  plugins: ['jest'],
  extends: ['plugin:jest/recommended', 'plugin:jest/style'],
  rules: {
    'jest/no-standalone-expect': [
      'error',
      { additionalTestBlockFunctions: ['itOnlyWin', 'itExceptWin'] },
    ],
  },
}

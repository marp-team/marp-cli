module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: { ecmaFeatures: { jsx: true } },
  rules: {
    'import/no-unresolved': ['error', { ignore: ['chalk', 'ts-key-enum'] }],
    'import/order': ['error', { alphabetize: { order: 'asc' } }],
  },
  settings: {
    'import/resolver': {
      node: { extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'] },
    },
    'import/ignore': ['@rollup/plugin-node-resolve'],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/consistent-type-assertions': [
          'error',
          { assertionStyle: 'as' },
        ],
      },
    },
  ],
}

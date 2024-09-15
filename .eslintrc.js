module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:import-x/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'import-x/no-unresolved': ['error', { ignore: ['ts-key-enum'] }],
    'import-x/order': ['error', { alphabetize: { order: 'asc' } }],
  },
  settings: {
    'import-x/resolver': {
      node: { extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'] },
    },
    'import-x/ignore': ['@rollup/plugin-node-resolve'],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/stylistic',
        'plugin:import-x/typescript',
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

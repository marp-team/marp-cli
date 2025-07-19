import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginImportX from 'eslint-plugin-import-x'
import eslintPluginJest from 'eslint-plugin-jest'
import eslintPluginN from 'eslint-plugin-n'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']
const testFiles = ['test/**', 'jest.setup.js']
const forFiles = (files, confs) => confs.map((conf) => ({ ...conf, files }))

export default tseslint.config(
  js.configs.recommended,
  eslintPluginImportX.flatConfigs.recommended,
  {
    plugins: {
      n: eslintPluginN,
    },
    rules: {
      'n/prefer-node-protocol': 'error',
    },
  },
  ...forFiles(tsFiles, [
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    eslintPluginImportX.flatConfigs.typescript,
    {
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
  ]),
  ...forFiles(testFiles, [
    eslintPluginJest.configs['flat/recommended'],
    eslintPluginJest.configs['flat/style'],
    {
      languageOptions: {
        globals: { ...globals.jest },
      },
      rules: {
        'jest/no-standalone-expect': [
          'error',
          { additionalTestBlockFunctions: ['itExceptWin', 'itOnlyWin'] },
        ],
      },
    },
  ]),
  eslintConfigPrettier,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'import-x/order': ['error', { alphabetize: { order: 'asc' } }],
    },
    settings: {
      'import-x/resolver': 'typescript',
    },
  },
  {
    ignores: [
      'bin/**/*',
      'coverage/**/*',
      'dist/**/*',
      'lib/**/*',
      'node_modules/**/*',
      'tmp/**/*',
      'types/**/*',
    ],
  }
)

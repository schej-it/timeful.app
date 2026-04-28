import eslint from '@eslint/js'
import tseslint, { type ConfigArray } from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import configPrettier from 'eslint-config-prettier'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: ConfigArray = [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', '*.config.cjs'],
  },

  // Core JS rules
  eslint.configs.recommended,

  // Strictest TypeScript rules — requires type information
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Vue 3 recommended rules
  ...pluginVue.configs['flat/recommended'],

  // TypeScript language service — resolves tsconfig.json references automatically
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Allow config/build files that are not in any tsconfig to be parsed
          allowDefaultProject: ['eslint.config.ts', '*.mjs', '*.cjs'],
        },
        tsconfigRootDir: __dirname,
      },
    },
  },

  // vue-eslint-parser handles .vue files; tseslint.parser handles their <script> blocks
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // TypeScript's type-checker already catches undefined identifiers in .vue scripts;
      // eslint/no-undef doesn't recognise DOM globals in vue-eslint-parser's scope.
      'no-undef': 'off',
    },
  },

  // Strict shared rules
  {
    rules: {
      // Catch all unused variables; prefix with _ to opt out
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Require `import type` for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Disallow loose object typing
      '@typescript-eslint/no-explicit-any': 'error',
      // Ban non-null assertions — use proper guards instead
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },

  // Disable type-checked rules for config/build files and plain JS (not covered by tsconfig)
  // eslint.config.ts is included here so type-checked rules don't run on the config itself
  {
    files: ['eslint.config.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Must be last — disables formatting rules that conflict with Prettier
  configPrettier,
]

export default config
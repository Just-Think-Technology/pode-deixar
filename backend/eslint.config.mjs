// @ts-check
// ESLint config for the @pode-deixar/* shared packages.
//
// Scope: it makes `pnpm lint` work in the shared packages, where the script
// existed but eslint was not a dependency and failed with `spawn ENOENT`.
//
// Two things are deliberately absent, each as its own task:
// - the type-aware rule sets the services use (recommendedTypeChecked): those
//   need every package's tsconfig to include its own test folder;
// - prettier: enforcing it here would reformat ~39 files that were never
//   linted, so it belongs in a dedicated formatting commit.
import eslint from '@eslint/js';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  securityPlugin.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // @pode-deixar/logger keeps `import fs = require("fs")` and lazy-requires
      // express inside the HTTP bootstrap on purpose.
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Best-effort filesystem work (mkdir, log rotation) swallows errors on
      // purpose; an empty catch is the documented behaviour there.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
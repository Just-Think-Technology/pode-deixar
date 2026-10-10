// @ts-check
// ESLint config for the @pode-deixar/* shared packages.
//
// Shared-package lint, at the backend root so the toolchain lives in one place.
//
// Scope: make `pnpm lint` work in the shared packages, where the script existed
// but eslint was not a dependency and failed with `spawn ENOENT`.
//
// The services also run the type-aware rule sets and prettier. Turning both on
// here was measured: 596 `prettier/prettier` plus ~150 real findings across the
// seven packages (`unbound-method`, `no-unnecessary-type-assertion`,
// `no-redundant-type-constituents`, `security/detect-unsafe-regex`, …). That is
// its own task, not something to fold into a rename. Every package's tsconfig
// already includes its test folder, so enabling them later is only a config
// change here.
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
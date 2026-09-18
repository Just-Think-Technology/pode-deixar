# CI Security Pipeline

## Backend jobs (`ci-backend.yml`)

`changes, quick, e2e, shared, security, build, image, codeql, dependency-review`

## Frontend jobs (`ci-frontend.yml`)

`quick, deep, security, image, codeql, dependency-review`

## Security gates

- **Dependency audit:** `pnpm audit --prod --audit-level=high` (backend + frontend)
- **Dependency review:** `actions/dependency-review-action@v4` on PRs
- **Secret scanning:** TruffleHog (`--only-verified --fail`)
- **Static analysis:** CodeQL with `security-extended` + `security-and-quality`
- **ESLint security:** `eslint-plugin-security` in every service
  (`securityPlugin.configs.recommended` in each `eslint.config.mjs`, ESLint 9
  flat config), enforced through the per-service `lint` in the `quick` job
  (no separate step in the `security` job). Extra rules: `detect-object-injection`,
  `detect-non-literal-fs-filename`, `detect-unsafe-regex`, `detect-buffer-noassert`,
  `detect-child-process`, `detect-disable-mustache-escape`,
  `detect-eval-with-expression`, `detect-no-csrf-before-method-override`,
  `detect-non-literal-regexp`, `detect-possible-timing-attacks`,
  `detect-pseudoRandomBytes`
- **Dockerfile scan:** Hadolint

A consolidated summary fails the pipeline if any job fails.

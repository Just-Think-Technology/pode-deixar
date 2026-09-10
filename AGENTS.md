# Agents

Instructions and context for AI agents (e.g. opencode) working on this project.
Single source of truth for product decisions, development rules and architecture.

> **Self-maintenance rule:** when a task changes any decision recorded here
> (new service, new product rule, new security policy, new deploy step),
> updating this file and the linked docs is part of the task — see
> "Task flow" step 7.

## Stack

- **Backend:** NestJS 11, TypeScript, Prisma 5.22, PostgreSQL
- **Frontend:** Next.js 16, React 19, shadcn/ui, Tailwind CSS 4
- **Infra:** Docker Compose, Caddy, pnpm 11 (workspaces), Redis 7, MinIO

## Monorepo layout

```
backend/
├── prisma/          # Shared schema and migrations
├── shared/          # Shared packages (logger, email, security, validation)
└── services/
    ├── auth/            # :3001 — Authentication
    ├── users/           # :3002 — Profiles and categories
    ├── service-orders/  # :3003 — Service orders and proposals
    ├── payments/        # :3004 — Payments (Mercado Pago, webhooks)
    └── reviews/         # :3005 — Reviews
backend/e2e/        # Cross-service journey tests (@pode-deixar/e2e)
frontend/
├── app/             # Next.js App Router
├── api/             # HTTP client
├── components/      # React components
├── lib/auth/        # Server actions and session
└── mock/            # Mock data for dev
docs/                # Security, product and deploy decisions
```

## Architecture

- No sync HTTP between services — integration is via the shared PostgreSQL
  (single Prisma schema in `backend/prisma/`); the frontend reaches services
  through the Caddy gateway (`/api/*`)
- Auth guards (`JwtAuthGuard`, `RolesGuard`, `Roles`), the global exception
  filter, token payload/revocation helpers and validation core live only in
  `@pode-deixar/security` / `@pode-deixar/validation`; the auth service keeps
  its own specialized guard/strategy/filter versions (IP logging, access-type
  check, DB user lookup)
- New code layering: controller (HTTP + validation) → service (business
  rules) → repository (Prisma); no Prisma in controllers, DTO on every input
- Code used by 2+ services is extracted to `backend/shared/` (`@pode-deixar/*`)
  by the task that creates the second usage

Full rules: [docs/architecture.md](docs/architecture.md).

## Main commands

Run each command from the stated directory (`backend/` or `frontend/`) —
never from the repo root.

```bash
# Backend — inside backend/
pnpm dev              # Prisma generate + start the 5 services
pnpm build            # Build shared + services
pnpm test             # Unit tests of the 5 services (needs local Postgres)
pnpm test:shared      # Tests of shared packages (logger, email, security, validation)
pnpm test:e2e         # Cross-service journeys (needs local Postgres)
pnpm lint             # ESLint on the 5 services
pnpm prisma:migrate   # Apply migrations (deploy)

# Frontend — inside frontend/
pnpm dev              # Dev server
pnpm build            # Production build
pnpm lint             # Lint + formatting
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright e2e
pnpm typecheck        # tsc --noEmit
```

CI runs the same gates per push: backend jobs `changes, quick, e2e, shared,
security, build, image, codeql, dependency-review`; frontend jobs
`quick, deep, security, image, codeql, dependency-review`.
Details: [docs/security/ci-pipeline.md](docs/security/ci-pipeline.md).

Backend `test` / `test:e2e` need a local Postgres with the per-service test
databases (`docker compose up -d postgres` from the repo root).

## Conventions

- **Language:** code, comments and identifiers in English; user-facing copy
  (validation messages, API error messages, emails, UI text) stays in
  Portuguese for BR users — comments explain only why/decisions, never what
- **This file and docs/ are in English**
- **Validation:** class-validator + class-transformer, messages in Portuguese
- **Auth:** JWT (access 15min + refresh 7 days) with rotation and blacklist
- **Roles:** CLIENT, PROVIDER, ADMIN
- **Soft delete:** services use `is_active`; orders move to CANCELLED
- **Commits:** messages and PR titles in English, Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`); PR body in Portuguese or English (what changed, how to validate, checks run)
- **Branches:** `feat/`, `fix/`, `docs/`, `test/`, `chore/`, `refactor/` + short slug (e.g. `feat/order-photos`)
- **Commit hygiene:** review `git status` / `git diff` before committing; never commit env files, secrets or generated artifacts

## Task flow

1. Understand the task — ask if anything is ambiguous
2. Create a specific branch with a descriptive name BEFORE any code change (never develop on main/develop; one task = one branch = one PR)
3. Study the existing architecture before coding; check [docs/task-checklists.md](docs/task-checklists.md) for the matching task type
4. Implement following best practices (DRY, SOLID where applicable, SRP, KISS, YAGNI, composition over inheritance, low coupling)
5. Update or create tests for the change; run `pnpm lint` and `pnpm typecheck`
6. Validate nothing broke (run the affected suites) — before push/PR, the affected suites plus `pnpm lint` and `pnpm typecheck` must be green
7. **Update this file / docs/ if the task changed or added a decision**
8. Open a PR (what changed, how to validate, checklist: tests, lint, typecheck, docs) and request review before the next task

## How to work

- Act directly within the task scope; present a plan for approval first only
  for large changes (new service, destructive migration, public contract)
- Chat in Portuguese: concise, with file paths/links and short test evidence
- Blocked (missing credential, ambiguous requirement, broken environment)?
  Stop, describe the blocker and the options, and wait — never guess ahead
- "Done" requires short evidence (e.g. suite counts, lint ok), not bare claims

## Code standards

- Clear, descriptive names; self-explanatory code; small cohesive functions
- No magic numbers; explicit error handling (never swallow exceptions)
- Minimal changes: touch only what the task needs; suggest (don't implement) unrelated improvements
- Reuse first: check for an existing equivalent before creating files, classes or services
- No premature optimization, but no knowingly wasteful queries, loops or allocations
- No new libraries without need and justification; check `package.json` first
- Public API/contract/behavior changes must be announced beforehand

## Security baseline

The backend is the source of truth — never trust values from the frontend
(prices, IDs, status). Full policies live in [docs/security/](docs/security/):

- [Card data (PCI-DSS)](docs/security/pci-card-data.md) — never store, accept, log or echo PAN/CVV; gateway tokenization only
- [Rate limiting](docs/security/rate-limiting.md) — 100 req/min global via `@nestjs/throttler`; stricter limits on sensitive endpoints; Redis in production
- [Content Security Policy](docs/security/content-security-policy.md) — centralized `getHelmetConfig()` in `@pode-deixar/security`
- [CI security pipeline](docs/security/ci-pipeline.md) — audit, dependency review, TruffleHog, CodeQL, eslint-plugin-security, Hadolint
- [Backups](docs/security/backups.md) — daily `pg_dump`, 7-day retention, tested restore
- [Encryption at rest](docs/security/encryption-at-rest-decision.md) — decision record

Per-task security checklists (new endpoint, Prisma migration, webhook/gateway,
new service): [docs/task-checklists.md](docs/task-checklists.md).

## Never do

1. **Never** open `.env.prod`, `.env.staging` or any production environment file
2. **Never** print, log or persist secrets, credentials, tokens, card data (PAN/CVV) or personal data beyond what the feature requires
3. **Never** run destructive commands (migrate reset, drop, mass delete) against staging/production data
4. **Do not** change secrets, infra config or CI/CD pipelines unless the task explicitly requires it
5. **Do not** remove existing security validations
6. **Do not** add unrequested features
7. **Do not** remove code without checking usages, impact and justification
8. **Do not** assume requirements — ask when ambiguous
9. **Do not** ignore errors — all handling must be explicit
10. **Never** push directly to main/develop — every change goes through a task branch + PR
11. **Never** push or open a PR with failing tests, lint or typecheck
12. **Never** run destructive commands (migrate reset, drop, mass delete, `rm -rf`) without prior confirmation — even locally
13. **Never** touch files outside the task scope ("drive-by" edits) — unrelated improvements go as text suggestions, never as code
14. **Never** use, repeat or persist secrets pasted in chat — redirect to the safe channel (GitHub Environments/secrets) instead
15. **Never** edit tests to make them pass — fix the source; test changes need an approved justification

## Product decisions

- [Ownership and data access](docs/decisions/ownership-access.md) — ownership validation, 403 semantics, proposal visibility, directed orders
- [Order photos](docs/decisions/order-photos.md) — MinIO, webp via sharp, limits, dedicated upload endpoint
- [Payments](docs/decisions/payments.md) — PIX/credit-card status, tokenization path, webhook idempotency, structured logging
- [Database](docs/decisions/database.md) — least-privilege role

## Deploy

All-free topology (Vercel + Oracle VPS + Neon + Cloudflare + Resend/Brevo),
`docker-compose.dev.yml` for local (own Postgres), `docker-compose.staging.yml` /
`docker-compose.production.yml` for deploy (one command each, stacks isolated by
`name`), Caddy vhosts, per-stack Redis:
[docs/deploy.md](docs/deploy.md).

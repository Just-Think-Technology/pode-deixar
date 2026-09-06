# Agents

This file contains instructions and context for AI agents (like opencode) working on this project.

Always kept up to date with product decisions, development rules, and architecture.

## Stack

- **Backend:** NestJS 11, TypeScript, Prisma 5.22, PostgreSQL
- **Frontend:** Next.js 16, React 19, shadcn/ui, Tailwind CSS 4
- **Infra:** Docker Compose, Caddy, pnpm 11 (workspaces), Redis 7

## Monorepo Structure

```
backend/
├── prisma/          # Shared schema and migrations
├── shared/          # Shared packages (logger, email, security)
│   ├── logger/          # Shared Pino logger
│   ├── email/           # Shared email service
│   └── security/        # Security settings (helmet CSP, Redis throttler)
└── services/
    ├── auth/            # :3001 — Authentication
    ├── users/           # :3002 — Profiles and categories
    ├── service-orders/  # :3003 — Service orders and proposals
    └── payments/        # :3004 — Payments (Mercado Pago, webhooks)
frontend/
├── app/             # Next.js App Router
├── api/             # HTTP client
├── components/      # React components
├── lib/auth/        # Server actions and session
└── mock/            # Mocked data for dev
scripts/             # Utility scripts (backup, restore, init-db)
docs/                # Decision documentation (security, etc.)
```

## Main Commands

```bash
# Backend — inside backend/
pnpm dev              # Generates Prisma client + starts the 4 services
pnpm build            # Builds shared + services
pnpm test             # Tests the 4 services

# Frontend — inside frontend/
pnpm dev              # Dev server
pnpm build            # Production build
pnpm lint             # Lint + formatting
```

## Conventions

- **Language:** Code and comments in Portuguese (business rules and validations)
- **Validation:** class-validator + class-transformer with messages in Portuguese
- **Authentication:** JWT (15min access + 7-day refresh) with rotation and blacklist
- **Roles:** CLIENT, PROVIDER, ADMIN
- **Soft delete:** Services use `is_active`, orders change status to CANCELLED
- **Commits:** Follow conventional commits (feat, fix, chore, etc.)

## Development Rules

### Best Practices

Always develop using:

- **DRY** — Don't Repeat Yourself
- **SOLID** — when applicable
- **Clean Code** — clean, readable code
- **Clean Architecture** — when it makes sense for the project
- **Low coupling and high cohesion**
- **SRP** — Single Responsibility Principle
- **KISS** — Keep It Simple, Stupid
- **YAGNI** — You Aren't Gonna Need It: do not implement unsolicited features
- **Composition > Inheritance** — prefer composition over inheritance

### Security First

**Always think about system security when developing any feature.** Before implementing, consider:

- **Authentication and authorization:** who can call the endpoint? Ownership/role validation on resources by ID (403 for improper access)
- **Backend is the source of truth** — never trust values sent by the frontend (prices, IDs, status); fetch/compute on the backend when applicable
- **Strict input validation** — use DTOs (class-validator), real UUIDs, limits
- **External event confirmation** — webhooks/gateways must validate signatures and verify amounts; fail-closed (reject when not validated)
- **Consistency with this file's security rules** — review production/infra before creating unnecessary exposure

### Card Data (PCI-DSS)

**Never store, expose, or log card PAN/CVV.** Rules for any feature:

- **Do not store** full card numbers, CVV, passwords, or PINs in database, cache, or logs
- **Do not accept** card data on the backend — data only travels from the client directly to the gateway (tokenization)
- **Always use** gateway tokenization (e.g., Mercado Pago card token) or hosted checkout/official components
- **Never send** card data to our servers unless necessary — the backend only sees the transaction token/ID, never the PAN
- **Remember logs** — sanitize every log (interceptor/filter) against card numbers and CVV
- Gateway response/error payloads **never** echo card fields

### Rate Limiting and Throttling

- **Global:** 100 req/min via `@nestjs/throttler` (memory in dev, Redis in production)
- **Sensitive endpoints:**
  - `POST /payments/webhook` (mock): 20 req/min
  - `POST /payments/webhook/mercadopago`: 60 req/min
  - `POST /services/me/:orderId/photos`: 20 req/min
  - `POST /payments/:paymentId/charge`: 10 req/min
- **Implementation:** `ThrottlerModule.forRootAsync` with `RedisThrottlerStorage` in production, memory in dev/test

### CSP (Content Security Policy)

- Centralized configuration in `@pode-deixar/security` (`getHelmetConfig()`)
- `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`
- `script-src/style-src` allow `'unsafe-inline'` only for Swagger UI
- HSTS (1 year, includeSubDomains, preload), `X-Frame-Options: DENY`
- Applied to all 4 services via `app.use(getHelmetConfig())`

### Backups and Restore

- **PostgreSQL Backup:** daily `pg_dump` at 03:00 UTC, 7-day retention, gzip
- **Service:** `postgres-backup` in docker-compose (PostgreSQL 16 + cron)
- **Restore:** `scripts/test-restore.sh` script — restores into a temporary DB, validates table/record counts, cleans up automatically
- **Volume:** persisted `backup_data`

### Distributed Rate Limiting (Redis)

- Redis 7-alpine in docker-compose (port 6379, `appendonly`, `maxmemory 256MB`, LRU)
- `RedisThrottlerStorage` implements the NestJS `ThrottlerStorage`
- `ThrottlerModule.forRootAsync` uses Redis in production (`NODE_ENV=production`), memory in dev/test

### CI Security Pipeline

- **Dependency Audit:** `pnpm audit --prod --audit-level=high` (backend + frontend)
- **Dependency Review:** `actions/dependency-review-action@v4` on PRs
- **Secret Scanning:** TruffleHog (`--only-verified --fail`)
- **CodeQL:** Static Analysis with `security-extended` + `security-and-quality` queries
- **ESLint Security:** `eslint-plugin-security` in all services
- **Dockerfile Scan:** Hadolint
- **Consolidated summary** at the end — fails if any job fails

### ESLint Security Plugin

- `eslint-plugin-security` configured in the 5 services (`securityPlugin.configs.recommended` in each `eslint.config.mjs`, ESLint 9 flat config)
- Enforced via per-service `lint` in the CI `quick` job (no separate step in the `security` job)
- Recommended + specific rules:
  - `detect-object-injection`, `detect-non-literal-fs-filename`, `detect-unsafe-regex`
  - `detect-buffer-noassert`, `detect-child-process`, `detect-disable-mustache-escape`
  - `detect-eval-with-expression`, `detect-no-csrf-before-method-override`
  - `detect-non-literal-regexp`, `detect-possible-timing-attacks`, `detect-pseudoRandomBytes`

### Card Data (PCI-DSS)

**Never store, expose, or log card PAN/CVV.** Rules for any feature:

- **Do not store** full card numbers, CVV, passwords, or PINs in database, cache, or logs
- **Do not accept** card data on the backend — data only travels from the client directly to the gateway (tokenization)
- **Always use** gateway tokenization (e.g., Mercado Pago card token) or hosted checkout/official components
- **Never send** card data to our servers unless necessary — the backend only sees the transaction token/ID, never the PAN
- **Remember logs** — sanitize every log (interceptor/filter) against card numbers and CVV
- Gateway response/error payloads **never** echo card fields

### Each Task's Workflow

1. Understand the task — ask if anything is ambiguous
2. Create a specific branch with a descriptive name
3. Analyze the existing architecture before coding
4. Implement the solution following best practices
5. Update tests when necessary
6. Validate that nothing was broken
7. Summarize the changes made
8. Request review before moving to the next task

### Clean Code

- Clear, descriptive names
- Self-explanatory code (avoid unnecessary comments)
- Small, cohesive functions
- Avoid magic numbers
- Proper error handling (never swallow exceptions)

### Minimal Changes

- Modify only what is necessary to solve the task
- Avoid broad refactors or unsolicited changes
- If you spot an improvement, only suggest it — do not implement without approval

### Reuse

- Before creating new files, classes, or services, check whether an equivalent already exists
- Reuse existing implementations whenever possible
- Avoid duplicated responsibilities

### Performance

- Avoid unnecessary queries
- Avoid duplicate processing
- Avoid redundant loops
- Avoid excessive memory allocation
- Do not optimize prematurely, but do not create inefficient solutions either

### Security

- Never expose credentials, hardcode passwords/tokens/keys, or log sensitive information
- Never remove existing security validations
- Always use environment variables and the project's existing mechanisms

### Dependencies

- Do not add new libraries or frameworks without need
- If truly necessary, justify before using
- Always check whether the package already exists in `package.json` before installing

### Git

- Each task on a specific branch (never develop on main/develop)
- Small, cohesive commits, each representing a single responsibility
- Clear messages following Conventional Commits:
  - `feat:` — new feature
  - `fix:` — bug fix
  - `refactor:` — refactoring
  - `chore:` — maintenance tasks
  - `test:` — tests
  - `docs:` — documentation

### Tests

- Create or update tests related to the feature whenever possible
- Ensure changes do not break existing features
- Do not remove tests without justification
- Run `pnpm lint` and `pnpm typecheck` after changes

## What NOT to Do

1. **Never** access `.env.prod`, `.env.staging`, or any production environment file
2. **Do not** modify secrets, credentials, infrastructure settings, or CI/CD pipelines unless explicitly part of the task
3. **Do not** add unsolicited extra features
4. **Do not** break compatibility — changes to public APIs, contracts, or existing behavior must be communicated beforehand
5. **Do not** remove code without first checking whether it is still used, assessing impacts, and justifying
6. **Do not** assume requirements — when ambiguous, ask before implementing
7. **Do not** ignore errors — all handling must be explicit and appropriate

## Code Standards

- **React:** Follow the shadcn/ui pattern (Radix composition + `cn()`)
- **Endpoints:** Create DTO with class-validator + Swagger decorator
- **Secrets:** Do not version — use environment variables

## Product Decisions

### Ownership and Data Access

- **Ownership validation:** Protected endpoints accessing resources by ID must always validate that the resource belongs to the authenticated user
- **Status code for ownership:** Use `403 Forbidden` (not `400 Bad Request`) when the resource does not belong to the user — more semantic for authorization
- **Proposal reading (GET /services/:orderId):**
  - CLIENT owning the order → sees all proposals
  - PROVIDER with a proposal on the order → sees only their own proposal
  - All other cases → 403 Forbidden
- **Public vs authenticated endpoint:** Sensitive data (proposals with amounts) must never be exposed without authentication
- **ProviderId on orders:** Orders may target a specific provider (`providerId` set) or be open on the marketplace (`providerId` null). Proposals are only allowed from the target provider when `providerId` is set.
- **Order reading by PROVIDER (GET /services/:orderId):**
  - If `order.providerId` is set and is the user → sees order data + their proposal (if any)
  - If `order.providerId` is set and is NOT the user → 403 Forbidden
  - If `order.providerId` is null → sees order data + their proposal (if any)

### Order Photos (OrderPhoto)

- **Storage:** MinIO, `order-photos` bucket
- **Format:** All photos converted to `.webp` via `sharp` (quality 80)
- **Limit:** Max 10 photos per order, 5MB per photo
- **Upload:** Separate endpoint `POST /services/me/:orderId/photos` (multipart), after order creation
- **Validation:** Only the CLIENT owning the order may upload photos

### Payments and Card Data (PCI)

- **Current flow:** PIX via Mercado Pago (sandbox/production) and CREDIT_CARD **mock** (no real card data). Real card payments not implemented yet.
- **When real CREDIT_CARD is implemented:** use **Mercado Pago tokenization** (card token generated on the client via the official SDK/Bricks) or **hosted Checkout Pro** — never receive PAN/CVV on the backend
- **Backend only sees** the gateway's card token/transaction ID; never the full number
- **Logs:** payments interceptor/filter sanitize PAN and CVV (`sanitizar-dados-sensiveis.ts`)

### Payment Webhooks (Idempotency and Anti-Replay)

- **Mock:** mandatory `eventId` in the DTO + optional `timestamp` (±5min window)
- **Mercado Pago:** `x-request-id` header as `eventId` (unique per notification) + HMAC signature with timestamp ±5min
- **Storage:** `payment_webhook_events` table with unique `(gateway, eventId)`
- **Idempotent processing:** checks whether the event was already processed → returns current state without reprocessing
- **Race condition:** P2002 (unique violation) treated as duplicate → returns current state
- **Amount validation:** compares local `amount` vs gateway before any transition
- **Gateway confirmation:** MP webhook calls `getPayment` to confirm the real status (never trusts the webhook alone)

### Structured Payment Logging

- **PaymentLoggerService** in `payments/src/payments/payment-logger.service.ts`
- Logged events:
  - `payment.created` — creation with `paymentId`, `orderId`, amount, method, idempotencyKey
  - `payment.status_changed` — transition with actor (MOCK/MERCADO_PAGO/USER/SYSTEM)
  - `payment.webhook_received` — success/duplicate/failure status, gateway, eventId
  - `payment.error` — errors with context
  - `payment.auth_failure` — webhook_key, signature, timestamp, replay
  - `payment.suspicious` — suspicious activity
- Automatic sanitization via `ResponseLoggerInterceptor` + `sanitizarDadosSensiveis`

### Least-Privilege DB User

- `scripts/init-db-least-privilege.sql` script creates the `pode_deixar_app` role
- Permissions: `SELECT, INSERT, UPDATE, DELETE` on tables, `USAGE` on sequences
- `REVOKE CREATE` on schema and database
- Default privileges configured for future tables/sequences

### Encryption at Rest

- **Documented decision:** `docs/security/encryption-at-rest-decision.md`
- **Not required in the application:** no stored PAN/CVV, passwords in bcrypt, infra provides LUKS/TDE
- Reassess if: storing card data, LGPD requires it, migrating to native TDE

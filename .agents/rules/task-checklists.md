# Task Checklists

Pick the matching type before coding. All types also follow the
[Security baseline](../AGENTS.md#security-baseline).

## New endpoint

- [ ] DTO with class-validator (messages in Portuguese) + Swagger decorator
- [ ] Auth guard + role check — who may call it?
- [ ] Ownership validation on resources by ID → 403 on mismatch
      (see [Ownership](decisions/ownership-access.md))
- [ ] Compute/lookup prices, IDs and status in the backend — never trust the frontend
- [ ] Stricter throttle on sensitive routes (see [Rate limiting](security/rate-limiting.md))
- [ ] Tests for happy path + 401/403 cases; run `pnpm lint` and `pnpm typecheck`

## Prisma migration

- [ ] Schema change in `backend/prisma/schema.prisma`; `prisma migrate dev`
      locally and review the generated SQL
- [ ] Backfill/default for existing rows when adding required columns
- [ ] New tables need the least-privilege grants
      (see [Database](decisions/database.md))
- [ ] **Never** run reset/drop/mass-delete against staging/production data
- [ ] Update affected service tests; run the 5 service suites + `test:e2e`

## Webhook / gateway integration

- [ ] Validate the signature with the gateway secret (HMAC); fail-closed —
      reject when not validated
- [ ] Mandatory unique event id (`eventId` / `x-request-id`) with unique
      `(gateway, eventId)` storage; P2002 → treat as duplicate
- [ ] Timestamp/replay window (±5min); confirm state via the gateway
      (`getPayment`) instead of trusting the payload
- [ ] Validate amounts (local vs gateway) before any state transition
- [ ] Sanitize logs (no PAN/CVV/secrets); structured events via the payment logger
- [ ] Tests: duplicate delivery, bad signature, replay, amount mismatch

## New service

- [ ] Pick the next free port (`:3006`, …); wire `SERVICE_<NAME>_PORT` with fallback
- [ ] Prisma client generation + module registration in `backend/`
- [ ] Auth guard pattern copied from an existing service (JWT + roles)
- [ ] Helmet via `getHelmetConfig()` + `ThrottlerModule.forRootAsync`
      (Redis in production)
- [ ] Compose entries (dev + prod), Caddy handles (dev + prod), health endpoint
- [ ] CI: add the service to `lint`/`test` chains and the `quick`/`build` jobs
- [ ] **Update AGENTS.md** (tree, ports, commands) — self-maintenance rule

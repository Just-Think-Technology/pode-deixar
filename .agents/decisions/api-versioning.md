# API Versioning

- **Status:** Accepted — 2026-09-20
- **Scope:** All 5 Nest services + Caddy gateway + Next.js frontend

## Context

The API was unversioned (`/api/*` stripped to `/*`). Adding fields or changing contracts risked breaking existing clients (mobile, cached frontend, external integrations) with no migration path.

## Decision

- **URL versioning:** current version is `v1` at `/api/v1/*`.
- **Backend:** every Nest service calls `app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready', 'health/live'] })` in `backend/shared/logger/bootstrap.ts:46` (re-asserted per-service `main.ts:onAppCreated` — idempotent). Controllers stay unprefixed; prefix is routing-only. No Prisma/schema change.
- **Gateway:** Caddy (`deploy/Caddyfile.docker`, `deploy/Caddyfile.production`) exposes `handle /api/v1/* { uri strip_prefix /api/v1; reverse_proxy <service> }` for each domain (auth, profiles/providers/categories, services/proposals, payments, reviews, storage) plus matching health handles `handle /api/v1/<service>/health* { uri strip_prefix /api/v1/<service>; }`. Health is excluded from the Nest prefix so Caddy can strip to `/health` and direct probes (`:3001/health`) still work without the gateway.
- **Legacy:** `handle /api/*` is kept for backward compatibility. Every legacy handle adds `header Deprecation "true"` and `header Sunset "Sat, 31 Dec 2026 23:59:59 GMT"` (RFC 8594 / RFC 9110 `Sunset`). Same `strip_prefix /api` logic as before.
- **Frontend:** `frontend/api/client.ts:5` exports `API_PREFIX = '/api/v1'` and `getApiBaseUrl()` normalizes `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_INTERNAL_URL` (strips trailing `/api` or `/api/v1`) then appends `API_PREFIX`. All `apiFetch*` call sites use this base; no hard-coded `/api` remains.
- **Optional header:** clients may send `Accept: application/vnd.pode-deixar.v1+json`; the server does not yet negotiate on it — it is reserved for future content-negotiation without URL change. URL is the authoritative version.

## Deprecation policy

- Legacy `/api/*` (unversioned) is **deprecated** as of 2026-09-20 and **sunsets 2026-12-31 23:59:59 GMT**. Responses carry `Deprecation: true` and `Sunset: Sat, 31 Dec 2026 23:59:59 GMT`.
- Breaking changes (removed/renamed fields, auth/contract changes) require a new prefix `/api/v2/*` (new `setGlobalPrefix` + new Caddy `handle /api/v2/*`). `v1` is kept for at least one full release after `v2` ships.
- Non-breaking changes (additive fields, new optional query params, new endpoints) stay on `v1`.
- Clients should migrate to `/api/v1/*` before Sunset; after Sunset the gateway may return `410 Gone` or remove the legacy handles.

## Alternatives considered

- **Header-only versioning** (`Accept` / `X-API-Version`) — rejected: harder to route at the edge, invisible in logs, requires custom middleware per service.
- **No versioning / breaking in place** — rejected: no safe evolution for external clients.
- **Per-service independent versions** — rejected: operational complexity; single `v1` aligns the 5 services behind one gateway contract.

## Consequences

- All service, integration and E2E tests call `/api/v1/*` (see Task 4). Direct service probes use `/health`.
- Swagger remains at `/api/docs` (not versioned) per service.
- Future `v2` is additive: duplicate Caddy handles + either a second Nest prefix or a router-level version switch — no DB migration required.

## References

- Implementation plan: `docs/superpowers/plans/2026-09-20-api-versioning.md`
- API contract: `docs/API.md` (Versioning section)
- Gateway: `deploy/Caddyfile.docker`, `deploy/Caddyfile.production`
- Bootstrap: `backend/shared/logger/bootstrap.ts:46`, `backend/services/*/src/main.ts`

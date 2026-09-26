# API Versioning

- **Status:** Accepted — 2026-09-20
- **Scope:** All 5 Nest services + Caddy gateway + Next.js frontend

## Context

The API was unversioned (`/api/*` stripped to `/*`). Adding fields or changing contracts risked breaking existing clients (mobile, cached frontend, external integrations) with no migration path.

## Decision

- **URL versioning:** current version is `v1` at `/api/v1/*`.
- **Single source:** deploy sets the version once via `API_VERSION` (default `v1` everywhere — unset means current behavior). The three homes read it: `API_VERSION` in `backend/shared/logger/bootstrap.ts`, `NEXT_PUBLIC_API_VERSION` as `API_VERSION` in `frontend/api/client/http.ts`, `{$API_VERSION:v1}` in both Caddyfiles (wired via `API_VERSION: ${API_VERSION:-v1}` on the caddy service in `deploy/docker-compose.yml` + `docker-compose.production.yml`). A bump sets all three consistently — see "Bump procedure" below.
- **Backend:** every Nest service calls `app.setGlobalPrefix(`api/${apiVersion}`, { exclude: ['health', 'health/ready', 'health/live'] })` in `backend/shared/logger/bootstrap.ts` (re-asserted per-service `main.ts:onAppCreated` — idempotent). Controllers stay unprefixed; prefix is routing-only. No Prisma/schema change.
- **Gateway:** Caddy (`deploy/Caddyfile.docker`, `deploy/Caddyfile.production`) exposes `handle /api/{$API_VERSION:v1}/* { reverse_proxy <service> }` for each domain (auth, profiles/providers/categories, services/proposals, payments, reviews) — forwarded unchanged because the Nest prefix is part of the upstream path. Storage (`/api/{$API_VERSION:v1}/storage/*`) still strips to `/` since MinIO has no prefix. Health handles `handle /api/{$API_VERSION:v1}/<service>/health* { uri strip_prefix ...; }` strip to `/health` because health is excluded from the Nest prefix, so direct probes (`:3001/health`) still work without the gateway. Placeholders expand at config load (`caddy validate` passes; `caddy adapt` shows `/api/v1/*` unset, `/api/v2/*` with `API_VERSION=v2`).
- **Legacy:** `handle /api/*` is kept for backward compatibility and rewritten to the versioned prefix (`uri replace /api/ /api/{$API_VERSION:v1}/ 1`; health handles strip to `/health`). Every legacy handle adds `header Deprecation "true"` and `header Sunset "Sat, 31 Dec 2026 23:59:59 GMT"` (RFC 8594 / RFC 9110 `Sunset`).
- **Frontend:** `frontend/api/client/http.ts` exports `API_VERSION` + `API_PREFIX = `/api/${API_VERSION}`` and `getApiBaseUrl()` normalizes `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_INTERNAL_URL` (strips trailing `/api` or `/api/<version>`) then appends `API_PREFIX`. All `apiFetch*` call sites use this base; no hard-coded `/api` remains.

## Bump procedure (v1 → v2)

1. Set `API_VERSION=v2` (and `NEXT_PUBLIC_API_VERSION=v2` at frontend build time) in deploy env — Caddy, the 5 Nest services and the frontend move together.
2. Keep `v1` serving during migration (second prefix/handles per the deprecation policy below) — a flag flip alone would drop `v1`; coordinate with the additive `v2` handles.
3. Update contract tests (`/api/v1/*` → new prefix) and this ADR.
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

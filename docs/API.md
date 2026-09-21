# API

Base contract for the Pode Deixar platform (5 Nest services behind the Caddy gateway + Next.js frontend).

## Base URL

- **Via gateway (browser):** `NEXT_PUBLIC_BACKEND_URL` — e.g. `http://localhost:8080` (dev, Caddy `:8080`) or `https://api-staging.seudominio.com` (staging/prod, `{$API_DOMAIN}`).
- **Server-side (RSC / Server Actions):** `BACKEND_INTERNAL_URL` if set, else `NEXT_PUBLIC_BACKEND_URL` (`frontend/api/client.ts:7`).
- The frontend normalizes the env value (strips trailing `/api` or `/api/v1`) and appends the version prefix — see Versioning.

## Versioning

- **Current:** `v1` at `/api/v1/*`. This is the canonical prefix for all clients.
- **Routing:** each Nest service sets `app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready', 'health/live'] })` (`backend/shared/logger/bootstrap.ts:46`, re-asserted in `backend/services/*/src/main.ts:onAppCreated`). Controllers remain unprefixed; Caddy strips the prefix before proxying.
- **Gateway:** `deploy/Caddyfile.docker` and `deploy/Caddyfile.production` expose `handle /api/v1/* { uri strip_prefix /api/v1; reverse_proxy <service> }` per domain (see table below) plus `handle /api/v1/<service>/health* { uri strip_prefix /api/v1/<service>; }` for health. Direct probes bypass the gateway at `http://<service>:<port>/health`, `/health/ready`, `/health/live` (excluded from the Nest prefix).
- **Legacy (deprecated):** `handle /api/*` is kept for backward compatibility. Every legacy handle returns `Deprecation: true` and `Sunset: Sat, 31 Dec 2026 23:59:59 GMT` (RFC 8594 / Sunset RFC 9110). Clients must migrate to `/api/v1/*` before Sunset; after Sunset the gateway may return `410 Gone` or remove the legacy handles.
- **Optional header:** `Accept: application/vnd.pode-deixar.v1+json` is reserved for future content-negotiation. The URL prefix is authoritative; the header is not yet enforced.
- **Evolution rule:** breaking changes (removed/renamed fields, auth or contract changes) require a new prefix `/api/v2/*` (new `setGlobalPrefix` + new Caddy handles). Non-breaking additive changes stay on `v1`. `v1` is kept for at least one full release after `v2` ships.

```http
# versioned (preferred)
GET /api/v1/auth/health        -> auth:3001/health
GET /api/v1/profiles/me        -> users:3002/profiles/me
GET /api/v1/services           -> service-orders:3003/services

# legacy (deprecated, same upstream, extra headers)
GET /api/auth/health           -> auth:3001/health  + Deprecation: true, Sunset: Sat, 31 Dec 2026 23:59:59 GMT
GET /api/profiles/me           -> users:3002/profiles/me  + Deprecation: true, Sunset: Sat, 31 Dec 2026 23:59:59 GMT
```

## Authentication

- JWT Bearer (`Authorization: Bearer <accessToken>`). Access 15 min, refresh 7 days with rotation and blacklist.
- Guards: `JwtAuthGuard` + `RolesGuard` from `@pode-deixar/security` (auth service uses specialized guards).
- Roles: `CLIENT`, `PROVIDER`, `ADMIN`.

## Routing table (via Caddy)

| Public prefix (versioned) | Public prefix (legacy) | Upstream |
|---|---|---|
| `/api/v1/auth/*` | `/api/auth/*` | `auth:3001` |
| `/api/v1/auth/health*` | `/api/auth/health*` | `auth:3001` (`/health`) |
| `/api/v1/profiles/*` | `/api/profiles/*` | `users:3002` |
| `/api/v1/providers/*` | `/api/providers/*` | `users:3002` |
| `/api/v1/categories*` | `/api/categories*` | `users:3002` |
| `/api/v1/services/*` | `/api/services/*` | `service-orders:3003` |
| `/api/v1/proposals/*` | `/api/proposals/*` | `service-orders:3003` |
| `/api/v1/payments/*` | `/api/payments/*` | `payments:3004` |
| `/api/v1/reviews/*` | `/api/reviews/*` | `reviews:3005` |
| `/api/v1/storage/*` | `/api/storage/*` | `minio:9000` (SeaweedFS S3) |
| Health direct | — | `http://<service>:<port>/health` |

Swagger per service stays at `http://<service>:<port>/api/docs` (not versioned).

## Frontend usage

```ts
import { apiFetch, API_PREFIX } from '@/api/client';
// API_PREFIX === '/api/v1'
// getApiBaseUrl() === `${normalizedEnv}${API_PREFIX}`
await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(dto) });
// -> fetch(`${base}/api/v1/auth/login`)
```

`getApiBaseUrl()` strips a trailing `/api` or `/api/v1` from the env so `http://localhost:8080/api` does not become `/api/api/v1`.

## Error and deprecation headers

- Legacy `Deprecation: true` + `Sunset: Sat, 31 Dec 2026 23:59:59 GMT` on every `handle /api/*` response.
- Versioned `handle /api/v1/*` responses carry no deprecation headers.

## References

- ADR: `.agents/decisions/api-versioning.md`
- Plan: `docs/superpowers/plans/2026-09-20-api-versioning.md`
- Gateway: `deploy/Caddyfile.docker`, `deploy/Caddyfile.production`
- Bootstrap: `backend/shared/logger/bootstrap.ts`, `backend/services/*/src/main.ts`
- Client: `frontend/api/client.ts`

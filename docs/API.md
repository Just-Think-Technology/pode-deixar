# API

Base contract for the Pode Deixar platform (5 Nest services behind the Caddy gateway + Next.js frontend).

## Base URL

- **Via gateway (browser):** `NEXT_PUBLIC_BACKEND_URL` — e.g. `http://localhost:8080` (dev, Caddy `:8080`) or `https://api-staging.seudominio.com` (staging/prod, `{$API_DOMAIN}`).
- **Server-side (RSC / Server Actions):** `BACKEND_INTERNAL_URL` if set, else `NEXT_PUBLIC_BACKEND_URL` (`frontend/api/client.ts:7`).
- The frontend normalizes the env value (strips trailing `/api` or `/api/v1`) and appends the version prefix — see Versioning.

## Versioning

- **Current:** `v1` at `/api/v1/*`. This is the canonical prefix for all clients.
- **Routing:** each Nest service sets `app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready', 'health/live'] })` (`backend/shared/logger/bootstrap.ts:46`, re-asserted in `backend/services/*/src/main.ts:onAppCreated`). Caddy forwards `/api/v1/*` unchanged so the upstream sees the versioned path.
- **Gateway:** `deploy/Caddyfile.docker` and `deploy/Caddyfile.production` expose `handle /api/v1/* { reverse_proxy <service> }` per domain (see table below) plus `handle /api/v1/<service>/health* { uri strip_prefix /api/v1/<service>; }` for health (stripped because health is excluded from the Nest prefix). Legacy `handle /api/*` rewrites to `/api/v1/*` (`uri replace /api/ /api/v1/ 1`, health handles strip to `/health`). Direct probes bypass the gateway at `http://<service>:<port>/health`, `/health/ready`, `/health/live`.
- **Legacy (deprecated):** `handle /api/*` is kept for backward compatibility. Every legacy handle returns `Deprecation: true` and `Sunset: Sat, 31 Dec 2026 23:59:59 GMT` (RFC 8594 / Sunset RFC 9110). Clients must migrate to `/api/v1/*` before Sunset; after Sunset the gateway may return `410 Gone` or remove the legacy handles.
- **Optional header:** `Accept: application/vnd.pode-deixar.v1+json` is reserved for future content-negotiation. The URL prefix is authoritative; the header is not yet enforced.
- **Evolution rule:** breaking changes (removed/renamed fields, auth or contract changes) require a new prefix `/api/v2/*` (new `setGlobalPrefix` + new Caddy handles). Non-breaking additive changes stay on `v1`. `v1` is kept for at least one full release after `v2` ships.

```http
# versioned (preferred, forwarded unchanged)
GET /api/v1/auth/health        -> auth:3001/health
GET /api/v1/profiles/me        -> users:3002/api/v1/profiles/me
GET /api/v1/services           -> service-orders:3003/api/v1/services

# legacy (deprecated, rewritten to /api/v1/*, extra headers)
GET /api/auth/health           -> auth:3001/health  + Deprecation: true, Sunset: Sat, 31 Dec 2026 23:59:59 GMT
GET /api/profiles/me           -> users:3002/api/v1/profiles/me  + Deprecation: true, Sunset: Sat, 31 Dec 2026 23:59:59 GMT
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

## Reviews (reviews:3005)

All review endpoints require `Authorization: Bearer <accessToken>` (`JwtAuthGuard` + `RolesGuard` from `@pode-deixar/security`). Roles allowed per endpoint below. IDs are validated with `ParseUUIDPipe` (400 on malformed).

### POST /api/v1/reviews — Create review

- **Roles:** `CLIENT`, `PROVIDER`
- **Body:** `CreateReviewDto` `{ serviceOrderId: UUID, rating: 1..5, comment?: string(0..1000) }` — messages in Portuguese.
- **Guards:** order must be `COMPLETED` + `PAID` (payments), caller must be `clientId` or `providerId` of the order, `!providerId` → 400, duplicate `(order, reviewer)` → 400 (P2002 race → 400).
- **Success 201:** `{ id, service_order_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at }` and `reviewee` rating/total recalculated via `ProviderProfile`/`ClientProfile` (`recalculateRating` inside `$transaction`).
- **Errors:** `401` no token, `403` not a party, `404` order missing, `400` order not completed/paid or rating invalid.

### GET /api/v1/reviews/me — List own reviews

- **Roles:** `CLIENT`, `PROVIDER`
- **Success 200:** `Review[]` (full shape with ids) ordered `createdAt desc`.

### GET /api/v1/reviews/service-order/:orderId — List order reviews

- **Roles:** `CLIENT`, `PROVIDER`
- **Guard:** caller must be `clientId` or `providerId` → `403` otherwise, `404` order missing.
- **Success 200:** `Review[]`.

### PATCH /api/v1/reviews/:reviewId — Edit own review (5-minute window)

- **Roles:** `CLIENT`, `PROVIDER`
- **Guard:** `reviewerId === sub` → `403`, not found → `404`, `Date.now() > createdAt+5min` → `400`, no field → `400`.
- **Success 200:** updated review; rating recalculated.
- **DELETE /api/v1/reviews/:reviewId** — same guards, `200` `{ message }`, rating recalculated.

### GET /api/v1/reviews/provider/:providerId — Provider listing (paginated, privacy-guaranteed)

- **Roles:** `CLIENT`, `PROVIDER` (authenticated, no 403 by role — the resource is public but privacy-shaped)
- **Params:** `providerId` resolves as `ProviderProfile.id` *or* `User.id` (fallback) → `404` if neither.
- **Query:** `PageQueryDto` `page?` default 1, `limit?` default 10 `Max(50)` → `400` when `>50` or non-int.
- **Filter:** only reviews where `serviceOrder.status = COMPLETED` **and** `payments.some(status=PAID)` — `CANCELLED`/`OPEN`/`PENDING` orders never surface; enforced via `countFilteredReviews`/`findFilteredReviews` (`filteredWhere`).
- **Privacy shape:** each item is `{ id, rating, comment, created_at, reviewer: { display_name, avatar_url }, response: { message, created_at }|null }`. Never exposes `reviewer_id`, `reviewee_id`, `service_order_id`. `display_name` is `firstName + lastInitial.` via `formatDisplayName` (`null`/blank → `"Cliente"`); `avatar_url` from `ClientProfile.avatarUrl` else `null`. `response` is embedded via `include: { response: true }`.
- **Success 200:** `{ data: ReviewPublic[], meta: { total, page, limit, hasMore } }` where `hasMore = skip+take < total` and `total` from `countFilteredReviews`.
- **Errors:** `401` no token, `400` bad UUID/limit, `404` provider not found.

### GET /api/v1/reviews/provider/:providerId/summary — Provider reputation

- **Roles:** `CLIENT`, `PROVIDER`
- **Success 200:** `{ provider_id, average: number|null, total, distribution: {1..5} }`. Computed via `aggregateFilteredReviews` (`_avg.rating`, `_count._all`) + `groupByRatingFiltered` (same `filteredWhere`). `average` is `null` when `total=0`; `distribution` always has keys `1..5` (missing → 0). Same `404`/`401`/`400` semantics as listing.

### GET /api/v1/reviews/received — Provider inbox (provider only)

- **Roles:** `PROVIDER` only → `403` for `CLIENT`.
- **Query:** same `page`/`limit` as provider listing (defaults 1/10, cap 50).
- **Filter/Shape:** same `filteredWhere` + privacy shape as provider listing, plus `report_status: "NONE" | "PENDING" | "RESOLVED"` per review (lookup `ReviewReport` by `(reviewId, reporterId=userId)`; `PENDING` → `PENDING`, `DISMISSED`/`UPHELD` → `RESOLVED`, none → `NONE`). `response` embedded. Paginated `meta.hasMore`.
- **Isolation:** `revieweeId = sub` only — provider B never sees provider A's reviews (`total 0`).
- **Errors:** `401`/`403`/`400` as above.

### POST /api/v1/reviews/:reviewId/response — Create provider response (reviewee only)

- **Roles:** `CLIENT`, `PROVIDER`
- **Body:** `CreateReviewResponseDto` `{ message: string(1..500) }` → `400` on empty/too long.
- **Guards:** review not found → `404`, `review.revieweeId !== sub` → `403`, existing response → `409` (P2002 race → 409).
- **Success 201:** `{ id, review_id, message, created_at, updated_at }`; visible as `response` in both provider listing and received.

### PATCH /api/v1/reviews/:reviewId/response — Update response (reviewee only)

- **Roles:** `CLIENT`, `PROVIDER`
- **Guards:** same `404`/`403` as create, response not found → `404`.
- **Success 200:** updated response.

### POST /api/v1/reviews/:reviewId/reports — Report a review (reviewee only)

- **Roles:** `CLIENT`, `PROVIDER`
- **Body:** `CreateReviewReportDto` `{ reason: OFENSA|PALAVRAO|PREJUDICAR|SPAM|OUTRO, description?: string(0..1000) }` → `400` on invalid enum.
- **Guards:** review not found → `404`, `review.revieweeId !== sub` → `403` (reviewer cannot report own review toward provider; intruder → 403), existing report (any status) → `409` "Denúncia já em análise" (P2002 race → 409).
- **Success 201:** `{ id, review_id, reporter_id, reason, description, status: PENDING, created_at }`.
- **Visibility:** reports do **not** hide the review — `comment` stays visible in provider listing; `received` exposes `report_status`. Admin moderation (DISMISSED/UPHELD) maps to `RESOLVED` in `received`.

### Reputation recalculation

Every `POST` (create), `PATCH` (update) and `DELETE` of a review runs `recalculateRating(revieweeId, tx)` inside the same `$transaction`: `review.aggregate({ where: { revieweeId }, _avg.rating, _count._all })` then `providerProfile.updateMany` + `clientProfile.updateMany` with `{ rating, totalReviews }`. Cross-service read (`users` service) sees the same rows via shared DB; e2e `provider-journey` asserts `profile.rating`/`total_reviews` after create/patch/delete.

### Privacy & reputation decisions

See ADR: `.agents/decisions/reviews-reputation.md`.

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

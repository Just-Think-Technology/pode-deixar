# Reviews and Reputation

- **Status:** Accepted — 2026-09-22 (JTT-108)
- **Scope:** `reviews:3005` + shared Prisma schema + `users:3002` read via shared DB

## Context

Provider reputation drives booking conversion but exposes privacy and gaming risks:
unpaid or cancelled orders must not inflate reputation, reviewer identity must not leak
PII, provider inbox must be isolated, responses and reports need strict ownership,
and rating must stay consistent across services without sync HTTP.

## Decision

### Reputation filter — COMPLETED + PAID only

- Every provider-facing read (`GET /reviews/provider/:id`, `/summary`, `GET /reviews/received`)
  uses `filteredWhere = { revieweeId, serviceOrder: { status: COMPLETED, payments: { some: { status: PAID } } } }`
  via `countFilteredReviews`/`findFilteredReviews`/`aggregateFilteredReviews`/`groupByRatingFiltered`
  (`backend/services/reviews/src/reviews/reviews.repository.ts:filteredWhere`).
- Rationale: prevents reputation from `OPEN`/`IN_PROGRESS`/`CANCELLED` orders and from unpaid orders.
  The same filter powers `summary` (`aggregate` + `groupBy`) and listing; a `CANCELLED` review inserted
  directly in DB is invisible in listing and does not count in `distribution`/`total`/`average`.
- Creation is gated independently: `POST /reviews` checks `order.status === COMPLETED` and
  `payment.status === PAID` before dedup (`serviceOrderId + reviewerId` unique).

### Privacy shape — no ID leak

- Provider listing and `received` return the privacy shape:
  `{ id, rating, comment, created_at, reviewer: { display_name, avatar_url }, response, report_status? }`.
  Never `reviewer_id`, `reviewee_id`, `service_order_id`, or full `completeName`.
- `display_name` via `formatDisplayName(fullName)`: `First + LastInitial.` (`"Ana Silva Costa" → "Ana C."`),
  single token → itself, null/blank → `"Cliente"` (`reviews.repository.ts:formatDisplayName`).
- `avatar_url` from `ClientProfile.avatarUrl` else `null` (`findReviewerProfiles`); missing profile is not an error.
- Ownership reads (`GET /reviews/me`, `/service-order/:orderId`) keep the full `reviewer_id`/`reviewee_id`
  shape because the caller is a party to the order; provider listing does not.

### Ownership and access

- Create: `resolveReviewee(order, reviewerId)` — client→provider, provider→client, otherwise `403`.
- Read by order: `clientId === userId || providerId === userId` else `403`; missing order `404`.
- Edit/delete review: `review.reviewerId === userId` else `403`; edit window 5 min (`EDIT_WINDOW_MINUTES`) else `400`.
- Provider `summary`/`listing`: `resolveProviderUserId(providerId)` tries `ProviderProfile.id` then `User.id` → `404` if neither.
- `GET /reviews/received`: `@Roles("PROVIDER")` only → `403` for `CLIENT`; `revieweeId = sub` isolation (provider B sees `total 0`).
- Response create/update: `review.revieweeId === sub` else `403`; review not found `404`, response missing `404`, duplicate `409` (P2002 → 409).
- Reports: `review.revieweeId === sub` else `403`; duplicate `(reviewId, reporterId)` unique → `409` both for `PENDING` and `DISMISSED`/`UPHELD` (same message `"Denúncia já em análise"`), P2002 race → `409`. Reports never hide the review comment.

### Responses and reports UX

- `ReviewResponse` (`reviewId` unique, `message` 1..500) embedded as `response` in both provider listing and received (`include: { response: true }`).
- `ReviewReport` (`reviewId + reporterId` unique, `reason ∈ {OFENSA, PALAVRAO, PREJUDICAR, SPAM, OUTRO}`, `description` 0..1000) creates `PENDING`. `received` maps `report.status` to `report_status`: `none→NONE`, `PENDING→PENDING`, `DISMISSED`/`UPHELD`→`RESOLVED`. Listing ignores reports (comment stays visible) — privacy decision, not moderation hiding.

### Reputation recalculation — transactional

- `createReview`, `updateReview`, `deleteReview` each run `prisma.$transaction(async tx => { write; await recalculateRating(revieweeId, tx) })` (`reviews.repository.ts:recalculateRating`).
- `recalculateRating` aggregates all reviews for `revieweeId` (unfiltered — counts every review the user received, not just COMPLETED+PAID? But provider `summary` is filtered; profile `rating` is global. This matches product: profile rating reflects all historical reviews, while provider listing/summary shows only trustworthy COMPLETED+PAID slice.
  Implementation currently aggregates **all** reviews for the reviewee; filtering to COMPLETED+PAID for the global profile would require the same `filteredWhere` — product decision is to keep global aggregation unfiltered for now (consistent with legacy).
- `updateMany` on both `providerProfile` and `clientProfile` (at most one row touches) with `{ rating, totalReviews }`.
- Cross-service visibility: `users` service reads `ProviderProfile.rating/totalReviews` on `GET /providers/:id/profile` — same DB, no HTTP sync; e2e `provider-journey` step 8 asserts recalc after `POST`, `PATCH` (5→3) and `DELETE` via `summary` + direct `providerProfile` read.

### Pagination

- `FindByProviderQueryDto extends PageQueryDto` (`@pode-deixar/validation:toSkipTake`) with `limit` default 10 `Max(50)` → `400` when >50 (controller) or capped via `toSkipTake` in service (50). `page` default 1. `meta = { total, page, limit, hasMore: skip+take < total }`.
- Applied to `provider/:id` listing and `/reviews/received` (same helper).

### Throttling and validation

- All review routes behind `JwtAuthGuard` + `RolesGuard`; sensitive `POST /reviews` throttling via global `@nestjs/throttler` (Redis in prod).
- DTOs `class-validator` messages in Portuguese (`CreateReviewDto`, `CreateReviewResponseDto`, `CreateReviewReportDto`, `FindByProviderQueryDto`).
- UUID validation via `ParseUUIDPipe` → `400`.

## Alternatives considered

- **Public unauthenticated listing** — rejected: privacy shape still leaks existence; require auth to reduce scraping and to reuse `display_name` logic with profile lookup.
- **Hide reported reviews** — rejected: keep content visible until moderation; `report_status` signals provider, not consumer.
- **Eventual recalc (cron/queue)** — rejected: transaction-local aggregate is simple and immediate; queue adds ops cost without benefit at current scale.
- **Filter global profile rating to COMPLETED+PAID only** — deferred: would require migration of existing profile ratings; current unfiltered global rating is acceptable and `summary` already filters the trustworthy slice.

## Consequences

- `docs/API.md` documents the 9 review endpoints with status, guards and shapes.
- `backend/services/reviews/test/` covers `summary empty/average/distribution`, `hasMore`, `401/403/404`, ID-leak, `CANCELLED` exclusion, response embedded, `received` isolation, `409`/`403` on responses/reports, and recalc after POST/PATCH/DELETE (unit + controller + integration + e2e).
- `backend/e2e/test/provider-journey.spec.ts` step 8 and `reviews-journey.spec.ts` exercise the cross-service flows.
- Future moderation dashboard can transition `ReviewReport.status` `PENDING→DISMISSED/UPHELD` and surface `RESOLVED` in `received` without changing the listing contract.

## References

- Schema: `backend/prisma/schema.prisma` (`Review`, `ReviewResponse`, `ReviewReport`, `ReportReason`, `ReportStatus`)
- Repository: `backend/services/reviews/src/reviews/reviews.repository.ts` (`filteredWhere`, `formatDisplayName`, `recalculateRating`)
- Service: `backend/services/reviews/src/reviews/reviews.service.ts`
- Controller: `backend/services/reviews/src/reviews/reviews.controller.ts`
- Tests: `backend/services/reviews/test/reviews.service.spec.ts`, `reviews.controller.spec.ts`, `reviews.integration.spec.ts`
- E2E: `backend/e2e/test/provider-journey.spec.ts`, `reviews-journey.spec.ts`
- API contract: `docs/API.md` (Reviews section)

# CONTEXT — Seams between frontend and backend

This document describes the integration seams (integration points) between the frontend (`frontend/`) and the backend services (`backend/services/*`) and how they are kept unified.

## Goals

- One home per logic: shared concerns live in `backend/shared/` or `frontend/api|lib`, never duplicated.
- No runtime divergence via `NEXT_PUBLIC_USE_MOCK`. The frontend always calls the real backend; mocks are test-only fixtures.
- E2E can run against the real backend (Docker Compose + Postgres) without mock stubs.

## Seams inventory

| Area | Frontend entry | Backend entry | Notes |
|------|----------------|---------------|-------|
| Auth | `frontend/api/login`, `frontend/lib/auth/*` | `auth` :3001 | JWT access/refresh, verify, session cookie `auth_session` |
| Profiles / categories | `frontend/api/client/*`, `frontend/api/worker/profile` | `users` :3002 | `GET /profiles/me`, `GET /categories`, `GET /providers/:id/profile` |
| Service orders & proposals | `frontend/api/client/service-orders`, `frontend/api/client/proposals`, `frontend/api/worker/requests` | `service-orders` :3003 | Orders, counter-proposals, tracking |
| Payments | `frontend/api/client/payments`, `frontend/lib/client/payments/*` | `payments` :3004 | `POST /payments`, `POST /payments/:id/charge`, `GET /payments/:id/status`, webhook polling |
| Reviews | `frontend/api/tracking` → `POST /reviews` | `reviews` :3005 | `POST /reviews`, `GET /reviews/service-order/:id` |
| Tracking / timeline | `frontend/api/tracking`, `frontend/lib/tracking/*` | `service-orders` :3003 + `payments` + `reviews` | `GET /services/:id/tracking`, `POST /services/me/:id/start|finish` |
| Worker finance / agenda | `frontend/api/worker/finance`, `frontend/api/worker/agenda` | `payments` + `service-orders` | Provider finance summary, agenda events |
| Worker orders completion | `frontend/api/worker/orders` | `service-orders` :3003 | `GET /services/me/:id/completion`, `POST /services/me/:id/complete`, photos via SeaweedFS S3 |

Cross-service integration is via the shared PostgreSQL (single Prisma schema in `backend/prisma/`); no sync HTTP between services. The frontend reaches services through Caddy (`/api/*`).

## Unified seam approach (no USE_MOCK divergence)

- **Removed:** all `if (process.env.NEXT_PUBLIC_USE_MOCK === "true")` branches in `frontend/api/**` and `frontend/lib/**/actions.ts`, `frontend/app/**`. See git history on `test/tdd-gaps`.
- **Kept:** `frontend/mock/**` as *test fixtures* only. They are imported by unit specs (`frontend/test/**`, `frontend/test/lib/**`) and by `mock/worker/completion.spec.ts`, but never by runtime code (`api/`, `lib/*/actions.ts`, `app/`). The tautological spec `frontend/test/mock/tracking.spec.ts` was deleted — it tested the mock itself.
- **Validation:** `frontend/lib/worker/requests/validation.ts` still accepts `mock-*` IDs only for fixture tests; production validation requires UUID. `frontend/lib/auth/image-actions.ts` keeps the same allowance for fixture images.
- **Error handling:** server actions no longer fallback to mock on `404/501/503`. They propagate `ApiError` and rely on backend as source of truth.

## Running E2E with the real backend

The Playwright config defaults to real backend. Mock mode is opt-in only.

```bash
# 1. Start infra and backend (one Postgres, 5 services, Caddy, SeaweedFS)
docker compose -f deploy/docker-compose.dev.yml up -d --build
# or locally:
pnpm --prefix backend dev

# 2. Configure frontend for real backend (no mock)
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080/api
# do NOT set NEXT_PUBLIC_USE_MOCK

# 3. Run E2E against real backend (default)
pnpm --prefix frontend test:e2e

# 4. Opt-in mock mode (legacy, for UI without backend)
E2E_USE_MOCK=true pnpm --prefix frontend test:e2e
```

`frontend/playwright.config.ts` respects `E2E_USE_MOCK=true` to re-enable `NEXT_PUBLIC_USE_MOCK=true` for local UI iteration. `frontend/e2e/helpers/auth.ts` still ships mock-cookie helpers for that mode; for real-backend E2E, use the backend login flow to seed the `auth_session` cookie (see `backend/e2e/test/apps.ts` for the cross-service journey setup).

## Testing guidelines (TDD red → green)

- See `.agents/rules/task-checklists.md` — **TDD — red → green → refactor** section. A failing test commit must precede the green implementation. PR review verifies the red→green sequence; CI enforces the green via `lint` + `typecheck` + `test` gates.
- Unit specs on seams/mappers (pure functions like `timeline-builder`), integration specs via `request(app)` on HTTP+DB, no repository tautologies.
- Optional local guard: `bash scripts/check-red-commit.sh origin/main`.

## References

- Architecture: `.agents/rules/architecture.md`
- Task checklists: `.agents/rules/task-checklists.md`
- CI pipeline: `.agents/security/ci-pipeline.md#tdd-red-green`
- Mock fixtures: `frontend/mock/**`

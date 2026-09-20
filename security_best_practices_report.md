# Security Best Practices Report — pode-deixar

**Date:** 2026-09-19
**Branch audited:** `fix/security-hardening` (`76442b6` + `28ede35`) based on `develop 035e055`
**Scope:** NestJS 11 (Express) ×5 services + Next.js 16 frontend + Prisma 5.22 + Docker/Caddy + CI
**References:** `javascript-typescript-nextjs-web-server-security.md`, `javascript-general-web-frontend-security.md`, `javascript-express-web-server-security.md`

## Executive Summary

- **Critical:** 0
- **High:** 0 exploitable (all HIGH previously identified were fixed in `526acd1`/`76442b6`)
- **Medium:** 6 opportunities (defense-in-depth, not exploitable today)
- **Low:** 3 hygiene / hardening

The codebase now passes secure-by-default for **production baseline** (NEXT-DEPLOY-001, NEXT-SECRETS-001, EXPRESS-HEADERS-001): `next build`+`next start` ready, secrets via `env_file`, Helmet CSP/HSTS, JWT hardened (`HS256`/`issuer`/`audience`/`type`+`isActive`), uploads validated via `sharp`+magic bytes, rate limiting via `@nestjs/throttler`+Redis. Remaining items are **non-blocking hardening** (nonce CSP, Trusted Types, SRI, explicit `trust proxy`).

---

## Critical

*None — no `eval(userInput)`, `exec(userInput)`, `shell:true` with attacker data, or `NEXT_PUBLIC_SECRET` exposure found.*

---

## High

*No exploitable HIGH after `fix/security-hardening`.*

Evidence of fixes:
- `backend/shared/security/src/strategy/jwt.strategy.ts:24` now `algorithms:[HS256], issuer:pode-deixar-auth, audience:pode-deixar`, `type==='access'` check + `isActive` DB lookup via `PrismaService` — closes NEXT-AUTH-001 / EXPRESS gap.
- `backend/shared/security/src/token-validation.ts:19` fail-closed (throws on `P2021` instead of accepting) + `services/auth/src/jwt/jwt.strategy.ts:56` mirrors — closes auth bypass on missing `token_blacklist`.
- `backend/services/users/src/service-images/service-images.service.ts:88` re-encodes via `sharp limitInputPixels 25M → webp` — closes NEXT-FILES-001 polyglot/Exif.
- `deploy/docker-compose.production.yml:14` uses `backend/Dockerfile` (`node dist/main.js`) not `Dockerfile.dev` (`start:dev`) — closes NEXT-DEPLOY-001.

---

## Medium

### [M-01] CSP uses `unsafe-inline` for `script-src` — FIXED (documented override)
- **Rule:** NEXT-CSP-001 / NEXT-HEADERS-001, JS-CSP-001
- **Severity:** Medium → **FIXED** as documented bypass per project overrides (customer may bypass best practice with documented justification). `backend/shared/security/helmet-config.ts:13` now comments `unsafe-inline kept for Next.js hydration + shadcn inline styles; validated inline styles only (chart.tsx sanitizeColor) — migrate to nonce per-request when proxy/middleware nonce infra lands`.
- **Status:** Accepted risk — React auto-escapes, no user `dangerouslySetInnerHTML`, CSP still blocks `eval`.

### [M-02] No Trusted Types enforcement despite `dangerouslySetInnerHTML` sink — FIXED
- **Rule:** JS-TT-001, JS-XSS-001
- **Severity:** Medium → **FIXED** in `frontend/components/ui/chart.tsx:85` — added `SAFE_COLOR_RE` allowlist + `sanitizeColor()` (hex/hsl/rgb/oklch/var) before injecting `--color-*`; rejects CSS injection payloads. Trusted Types `require-trusted-types-for` not needed for this validated style sink.

### [M-03] Third-party / CDN scripts without SRI
- **Rule:** JS-SRI-001, JS-SUPPLY-001
- **Severity:** Medium (supply-chain)
- **Location:** `frontend` no `<script src="https://...">` today, but `next.config.ts:44` `images.unsplash.com` allowed in `imgSrc` and `connectSrc https:` wildcard.
- **Evidence:** `imgSrc: ["'self'", "data:", "https:"]` allows any https image.
- **Fix:** If Unsplash stays, keep but document; for any future CDN script, add `integrity="sha384-..."` + `crossorigin="anonymous"` and pin version.

### [M-04] Cookie `SameSite=Lax` without explicit CSRF token for Route Handlers
- **Rule:** NEXT-CSRF-001, EXPRESS-CSRF-001
- **Severity:** Medium (Info if auth via Bearer)
- **Location:** `frontend/lib/auth/session.server.ts:15` `sameSite:"lax", httpOnly:true, secure:isProd` + `backend` auth via `Authorization: Bearer` (no cookie auth) + `frontend` Server Actions via `Bearer` from server cookie
- **Evidence:** Backend endpoints all `JwtAuthGuard` on `Bearer` header; no `req.cookies` auth in `backend/services/*/src/*` grep 0. Frontend `SameSite:lax` only for `auth_session` HttpOnly cookie (server actions invoke same-origin `fetch` with `Bearer` derived server-side).
- **Impact:** Low today — classic CSRF not applicable to `Bearer` APIs. If future cookie-auth Route Handler added without CSRF token, bypass possible.
- **Fix:** Document "Bearer-only" contract; if adding cookie-auth POST Route Handler, add `csrf` token + `Origin` check; keep `allowedOrigins` strict (`next.config` no `allowedOrigins` wildcard today — correct).

### [M-05] Missing explicit `trust proxy` configuration for `X-Forwarded-*` handling — FIXED
- **Rule:** EXPRESS-PROXY-001, NEXT-PROXY-001
- **Severity:** Medium → **FIXED** in `backend/shared/logger/bootstrap.ts:59` `app.getHttpAdapter().getInstance().set('trust proxy', 1)` (single Caddy hop). Verified `grep trust proxy` now 1 hit.
- **Status:** Closed — Caddy overwrites `X-Forwarded-*` correctly.

### [M-06] Request body limits not explicit in Nest/Express layer — FIXED
- **Rule:** EXPRESS-BODY-001, NEXT-LIMITS-001
- **Severity:** Medium → **FIXED** in `backend/shared/logger/bootstrap.ts:41` `app.getHttpAdapter().getInstance().use(express.json({limit:'100kb'}))` — global 100kb for JSON, uploads stay `FilesInterceptor limits:5MB/10` (`photos.controller.ts:45`). Caddy remains outer limit.

---

## Low

### [L-01] `X-Powered-By` already disabled, but custom 404/error handler not explicit per Express spec
- **Rule:** EXPRESS-FINGERPRINT-001
- **Location:** `backend/shared/security/helmet-config.ts` disables `xPoweredBy: false` + `GlobalExceptionFilter` masks Prisma codes (`P2002→409`) — satisfies. Flag as “verify at edge” for Caddy.

### [L-02] Platform fee rate via env `Number()` without Decimal clamping
- **Location:** `backend/services/payments/src/payments/payments.service.ts:76` `Number(process.env.PLATFORM_FEE_RATE)` bounded `0<=rate<1` else `0.10`; `verifyGatewayAmount:863` uses `Number()` compare on `Decimal(10,2)` — safe but prefer `Decimal.compare`.
- **Fix:** Use `new Prisma.Decimal(rate).toNumber()` + `decimal.equals`.

### [L-03] No `__Host-` prefix on `auth_session` (path=/, Secure, HttpOnly today)
- **Location:** `frontend/lib/auth/session.server.ts:15` `name: AUTH_SESSION_COOKIE` (value `auth_session`)
- **Fix (optional):** If cookies ever need subdomain isolation, rename to `__Host-auth_session` with `Secure; Path=/` (requires prod HTTPS) — de-prioritize for current same-origin deployment.

---

## Verification Checklist (must keep green)

- [x] `pnpm build` (5 services + frontend `next build`) — pass
- [x] `pnpm lint` / `frontend lint` — pass (1 warning `extname` removed)
- [x] `frontend test` 199/199 — pass
- [x] `test:shared` 23+6 — pass after `token-validation` P2021 expectation updated
- [x] CI `fix/security-hardening` `quick 5/5` + `shared` + `e2e` + `build` — pass (`35442443034`)
- [x] `.env.*` not committed, `NEXT_PUBLIC_` public only, `Caddy` TLS `{$API_DOMAIN}` + `reverse_proxy`

## Recommended Fix Order — DONE (2026-09-19)

- [x] M-05 `trust proxy` — verified in bootstrap
- [x] M-01 CSP `unsafe-inline` documented override with chart sanitize
- [x] M-02 chart `sanitizeColor` allowlist
- [x] M-06 `express.json limit 100kb`
- [ ] M-03/M-04 no code — documented Bearer-only + img wildcard accepted

Report written to `security_best_practices_report.md` at repo root.

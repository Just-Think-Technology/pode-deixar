# Architecture

## Service boundaries

- 5 independent NestJS services (`auth` :3001, `users` :3002,
  `service-orders` :3003, `payments` :3004, `reviews` :3005)
- **No sync HTTP calls between services.** Integration happens through the
  shared PostgreSQL database (single Prisma schema in `backend/prisma/`,
  client generated once via `pnpm prisma:generate`)
- External traffic enters through Caddy, which strips the `/api` prefix and
  routes per path (`/api/auth/*` → auth, `/api/profiles/*` → users, …);
  health endpoints keep the full path quirk documented in the Caddyfiles
- Cross-service reads respect ownership at the reader
  (see [Ownership](decisions/ownership-access.md)) — never bypass another
  service's authorization by querying its tables directly for writes

## Inside a service

Feature folders (`profiles/`, `payments/`, …), each with
controller / service / DTOs. For new code, strict layering:

1. **Controller** — HTTP only: route, auth guard, DTO validation, status codes
2. **Service** — business rules, orchestration, transaction boundaries
3. **Repository** — Prisma access; controllers never touch Prisma,
   services never embed raw queries outside repositories
4. **DTO** on every input (class-validator, messages in Portuguese) +
   Swagger decorator

Pre-existing code predates the repository layer — do not retrofit it
outside the task scope (see "Never do" 13 in AGENTS.md).

## Shared code

- `backend/shared/` packages (`@pode-deixar/logger`, `@pode-deixar/email`,
  `@pode-deixar/security`, `@pode-deixar/validation`) hold cross-service
  concerns: logging, email, Helmet CSP (`getHelmetConfig()`), Redis throttler
  storage, validation messages (`traduzirErrosValidacao`), image validation
  (`validarArquivoImagem`), Prisma error mapping (`resolverErroPrisma`)
- **Auth guards (JWT + roles) live only in `@pode-deixar/security`.**
  Per-service `jwt-auth.guard` / `roles.guard` copies are tech debt:
  migrate a service to the shared guards when touching its auth
- **Second-use rule:** code needed by a second service is extracted to
  `backend/shared/` by the task creating the second usage — no third copy

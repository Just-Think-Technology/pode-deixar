# Database

- **Status:** Accepted — per-service least-privilege roles since 2026-09-26
  (previously a single app role with full DML)
- **Least-privilege roles:** every Nest service connects with its own role
  (`role_auth`, `role_users`, `role_service_orders`, `role_payments`,
  `role_reviews`) — never a superuser, never a shared writer
- **Grants:** `SELECT` on all domain tables for every role (cross-service
  reads validate ownership at the reader); `INSERT, UPDATE, DELETE` only on
  the service allow-list; `USAGE` on schema and sequences; `REVOKE CREATE`
  on schema; default privileges keep `SELECT` on future tables while writes
  stay restricted
- **Write allow-list** (single source: `backend/prisma/roles.sql`, mirrored
  in `backend/scripts/check-db-roles.sh`):
  - `role_auth`: users, token_blacklist, client_profiles, provider_profiles
    (registration creates the profile row in the same transaction)
  - `role_users`: client_profiles, provider_profiles, provider_services,
    service_images, categories, notifications
  - `role_service_orders`: service_orders, order_timeline_events, proposals,
    counter_proposals, order_photos, notifications
  - `role_payments`: payments, payment_webhook_events,
    payment_status_history, service_orders (status sync on payment events),
    notifications
  - `role_reviews`: reviews, notifications, client_profiles,
    provider_profiles (rating aggregates)
- **Connection split:** `DATABASE_URL` uses the service role (runtime);
  `DIRECT_DATABASE_URL` stays privileged — Prisma Migrate (`migrate deploy`
  at auth startup) and `pg_dump` backup use it, never the role
- **Applying roles:** `backend/scripts/apply-db-roles.sh` (idempotent,
  passwords via `DB_ROLE_*_PASSWORD`, migrator via `DB_MIGRATOR`); local
  Postgres seeds them on first init (`init-roles.sh`); staging/production
  apply on Neon once with secrets, then per deploy only after migrations
  that add tables (see deploy/deploy.md)
- **CI enforcement:** `db-roles` job (`backend/scripts/check-db-roles.sh`)
  fails on (a) any `prisma/tx` write in `services/*/src` outside the
  allow-list, (b) grant drift on a migrated scratch DB, (c) missing 42501
  denial, DDL denial or default-privilege coverage
- **New table checklist:** add the table to the owner allow-list in
  `roles.sql` + `check-db-roles.sh`, re-apply roles on the environment,
  keep `SELECT` available to all readers via default privileges
- **Migrations** run with a privileged URL at deploy time
  (`pnpm prisma:migrate`), never with a service role

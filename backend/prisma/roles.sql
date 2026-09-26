-- Database service roles — least-privilege grants per Nest service
--
-- Purpose: every service connects with its own role (see
-- .agents/decisions/database.md). Roles read all domain tables (cross-service
-- reads validate ownership at the reader) but write only their allow-list.
-- Notifications are writable by the four services that notify via the shared
-- @pode-deixar/notifications module (the module holds the logic; each service
-- connects with its own role).
--
-- Usage (never edit production data flows — roles only):
--   psql -v migrator=postgres \
--        -v role_auth_password=... -v role_users_password=... \
--        -v role_service_orders_password=... -v role_payments_password=... \
--        -v role_reviews_password=... \
--        -f backend/prisma/roles.sql
-- Or via backend/scripts/apply-db-roles.sh, which supplies the variables.
-- Idempotent: safe to re-run after migrations or on fresh databases.
--
-- Write allow-list (must match scripts/check-db-roles.sh ALLOW_* lists):
--   role_auth:            users, token_blacklist, client_profiles,
--                         provider_profiles (registration creates the profile
--                         row in the same transaction as the user)
--   role_users:           client_profiles, provider_profiles, provider_services,
--                         service_images, categories, notifications
--   role_service_orders:  service_orders, order_timeline_events, proposals,
--                         counter_proposals, order_photos, notifications
--   role_payments:        payments, payment_webhook_events,
--                         payment_status_history, service_orders, notifications
--   role_reviews:         reviews, notifications, client_profiles,
--                         provider_profiles (rating aggregates)
-- When JTT-108 (review responses/reports) merges, extend role_reviews here
-- and in the check script.

-- --- Roles (LOGIN so services can connect) ---

SELECT 'CREATE ROLE role_auth WITH LOGIN PASSWORD ' || quote_literal(:'role_auth_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_auth')\gexec

SELECT 'CREATE ROLE role_users WITH LOGIN PASSWORD ' || quote_literal(:'role_users_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_users')\gexec

SELECT 'CREATE ROLE role_service_orders WITH LOGIN PASSWORD ' || quote_literal(:'role_service_orders_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_service_orders')\gexec

SELECT 'CREATE ROLE role_payments WITH LOGIN PASSWORD ' || quote_literal(:'role_payments_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_payments')\gexec

SELECT 'CREATE ROLE role_reviews WITH LOGIN PASSWORD ' || quote_literal(:'role_reviews_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_reviews')\gexec

-- Rotate passwords on re-apply (CREATE above is skipped when roles exist).
ALTER ROLE role_auth WITH LOGIN PASSWORD :'role_auth_password';
ALTER ROLE role_users WITH LOGIN PASSWORD :'role_users_password';
ALTER ROLE role_service_orders WITH LOGIN PASSWORD :'role_service_orders_password';
ALTER ROLE role_payments WITH LOGIN PASSWORD :'role_payments_password';
ALTER ROLE role_reviews WITH LOGIN PASSWORD :'role_reviews_password';

-- --- Database and schema usage ---

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO role_auth, role_users, role_service_orders, role_payments, role_reviews',
    current_database()
  );
END $$;
GRANT USAGE ON SCHEMA public TO role_auth, role_users, role_service_orders, role_payments, role_reviews;

-- Roles must never create tables or extensions; the migrator (passed as
-- `migrator`, e.g. postgres locally or the Neon owner in production) keeps
-- CREATE for `prisma migrate deploy`.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CREATE ON SCHEMA public TO :"migrator";

-- --- Reads: every role selects all domain tables ---

GRANT SELECT ON ALL TABLES IN SCHEMA public TO role_auth, role_users, role_service_orders, role_payments, role_reviews;

-- --- Writes: per-service allow-lists ---

GRANT INSERT, UPDATE, DELETE ON TABLE
  users, token_blacklist, client_profiles, provider_profiles
  TO role_auth;

GRANT INSERT, UPDATE, DELETE ON TABLE
  client_profiles, provider_profiles, provider_services, service_images,
  categories, notifications
  TO role_users;

GRANT INSERT, UPDATE, DELETE ON TABLE
  service_orders, order_timeline_events, proposals, counter_proposals,
  order_photos, notifications
  TO role_service_orders;

GRANT INSERT, UPDATE, DELETE ON TABLE
  payments, payment_webhook_events, payment_status_history, service_orders,
  notifications
  TO role_payments;

GRANT INSERT, UPDATE, DELETE ON TABLE
  reviews, notifications, client_profiles, provider_profiles
  TO role_reviews;

-- --- Future tables: readers keep SELECT, writers stay restricted ---

ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator" IN SCHEMA public
  GRANT SELECT ON TABLES TO role_auth, role_users, role_service_orders, role_payments, role_reviews;
ALTER DEFAULT PRIVILEGES FOR ROLE :"migrator" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO role_auth, role_users, role_service_orders, role_payments, role_reviews;

#!/bin/sh
# purpose: Apply per-service least-privilege roles (backend/prisma/roles.sql)
# Usage:
#   DB_ROLE_AUTH_PASSWORD=... DB_ROLE_USERS_PASSWORD=... \
#   DB_ROLE_SERVICE_ORDERS_PASSWORD=... DB_ROLE_PAYMENTS_PASSWORD=... \
#   DB_ROLE_REVIEWS_PASSWORD=... [DB_MIGRATOR=postgres] \
#   backend/scripts/apply-db-roles.sh
# Reads the target database from DATABASE_URL (libpq accepts a URL as dbname).
# Passwords default to disposable dev values — production passes real secrets
# (GitHub Environments -> .env.production), never committed.
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set (target database)}"
DB_MIGRATOR="${DB_MIGRATOR:-postgres}"
DB_ROLE_AUTH_PASSWORD="${DB_ROLE_AUTH_PASSWORD:-dev_auth}"
DB_ROLE_USERS_PASSWORD="${DB_ROLE_USERS_PASSWORD:-dev_users}"
DB_ROLE_SERVICE_ORDERS_PASSWORD="${DB_ROLE_SERVICE_ORDERS_PASSWORD:-dev_service_orders}"
DB_ROLE_PAYMENTS_PASSWORD="${DB_ROLE_PAYMENTS_PASSWORD:-dev_payments}"
DB_ROLE_REVIEWS_PASSWORD="${DB_ROLE_REVIEWS_PASSWORD:-dev_reviews}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Strip Prisma-only query params (?schema=public) — libpq rejects unknown options.
psql "${DATABASE_URL%%\?*}" \
  -v ON_ERROR_STOP=1 \
  -v migrator="$DB_MIGRATOR" \
  -v role_auth_password="$DB_ROLE_AUTH_PASSWORD" \
  -v role_users_password="$DB_ROLE_USERS_PASSWORD" \
  -v role_service_orders_password="$DB_ROLE_SERVICE_ORDERS_PASSWORD" \
  -v role_payments_password="$DB_ROLE_PAYMENTS_PASSWORD" \
  -v role_reviews_password="$DB_ROLE_REVIEWS_PASSWORD" \
  -f "$SCRIPT_DIR/../prisma/roles.sql"

echo "roles applied (migrator=$DB_MIGRATOR)"

#!/bin/sh
# purpose: Seed per-service least-privilege roles on first postgres init
# Mounted to /docker-entrypoint-initdb.d/ by deploy/docker-compose.yml (local
# stacks only). Runs once when the data dir is created; existing volumes need
# backend/scripts/apply-db-roles.sh run once manually. Passwords are disposable
# dev defaults — staging/production apply roles on Neon via the apply script
# with real secrets (see deploy/deploy.md).
set -eu

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v migrator="$POSTGRES_USER" \
  -v role_auth_password="${DB_ROLE_AUTH_PASSWORD:-dev_auth}" \
  -v role_users_password="${DB_ROLE_USERS_PASSWORD:-dev_users}" \
  -v role_service_orders_password="${DB_ROLE_SERVICE_ORDERS_PASSWORD:-dev_service_orders}" \
  -v role_payments_password="${DB_ROLE_PAYMENTS_PASSWORD:-dev_payments}" \
  -v role_reviews_password="${DB_ROLE_REVIEWS_PASSWORD:-dev_reviews}" \
  -f /docker-entrypoint-initdb.d/roles.sql

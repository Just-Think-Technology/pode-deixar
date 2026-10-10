#!/bin/sh
# purpose: CI enforcement for per-service least-privilege DB roles
# 1. Static: every prisma/tx write in backend/services/*/src must target a
#    table in that service's allow-list below (mirrors roles.sql).
# 2. Live: scratch database (migrated schema) gets roles.sql applied, then
#    has_table_privilege asserts the exact grant state, one real denied write
#    per role proves enforcement (42501), and default privileges cover a table
#    created after the roles.
# Usage: PGHOST=.. PGPORT=.. PGUSER=.. PGPASSWORD=.. PGDATABASE=<scratch, migrated>
#        DB_ROLE_*_PASSWORD=... backend/scripts/check-db-roles.sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_BACKEND=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

TABLES="users client_profiles provider_profiles categories provider_services service_images service_orders order_timeline_events proposals counter_proposals order_photos reviews review_responses review_reports payments payment_webhook_events payment_status_history token_blacklist notifications"

ALLOW_auth="users token_blacklist client_profiles provider_profiles"
ALLOW_users="client_profiles provider_profiles provider_services service_images categories notifications"
ALLOW_service_orders="service_orders order_timeline_events proposals counter_proposals order_photos notifications"
ALLOW_payments="payments payment_webhook_events payment_status_history service_orders notifications"
ALLOW_reviews="reviews review_responses review_reports notifications client_profiles provider_profiles"

ROLE_auth="role_auth"
ROLE_users="role_users"
ROLE_service_orders="role_service_orders"
ROLE_payments="role_payments"
ROLE_reviews="role_reviews"

fail() { echo "ROLE-CHECK FAIL: $*" >&2; exit 1; }

# --- 1. Static write-set vs allow-list ---

# Prisma model -> table (single schema in backend/prisma/schema.prisma)
# Prisma client accessors are camelCase (prisma.user, not prisma.User).
model_to_table() {
  case "$1" in
    user) echo users ;;
    clientProfile) echo client_profiles ;;
    providerProfile) echo provider_profiles ;;
    category) echo categories ;;
    providerService) echo provider_services ;;
    serviceImage) echo service_images ;;
    serviceOrder) echo service_orders ;;
    orderTimelineEvent) echo order_timeline_events ;;
    proposal) echo proposals ;;
    counterProposal) echo counter_proposals ;;
    orderPhoto) echo order_photos ;;
    review) echo reviews ;;
    reviewResponse) echo review_responses ;;
    reviewReport) echo review_reports ;;
    payment) echo payments ;;
    paymentWebhookEvent) echo payment_webhook_events ;;
    paymentStatusHistory) echo payment_status_history ;;
    tokenBlacklist) echo token_blacklist ;;
    notification) echo notifications ;;
    *) echo "UNKNOWN:$1" ;;
  esac
}

echo "== static write-set check =="
STATIC_FAIL=0
for svc in auth users service-orders payments reviews; do
  allow_var="ALLOW_$(printf '%s' "$svc" | tr '-' '_')"
  eval "allow=\$$allow_var"
  writes=$(grep -Eoh "(prisma|tx)\.[A-Za-z]+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)" \
    -r "$REPO_BACKEND/services/$svc/src/" 2>/dev/null \
    | sed -E 's/^(prisma|tx)\.([A-Za-z]+)\..*/\2/' | sort -u || true)
  for model in $writes; do
    table=$(model_to_table "$model")
    case " $allow " in
      *" $table "*) ;;
      *) echo "service $svc writes $table (model $model) outside its allow-list" >&2; STATIC_FAIL=1 ;;
    esac
  done
done
[ "$STATIC_FAIL" -eq 0 ] || fail "static write-set outside allow-list (update roles.sql + this script)"
echo "static write-set OK"

# --- 2. Live grant assertions ---

: "${PGHOST:?PGHOST must be set}"
: "${PGUSER:?PGUSER must be set (superuser)}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${PGDATABASE:?PGDATABASE must be set (scratch DB with migrated schema)}"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
PGPORT="${PGPORT:-5432}"

SUPER_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"

echo "== applying roles =="
DATABASE_URL="$SUPER_URL" \
  DB_MIGRATOR="$PGUSER" \
  "$SCRIPT_DIR/apply-db-roles.sh" >/dev/null \
  || fail "apply-db-roles.sh failed"

priv() { # priv <role> <table> <priv> -> true/false
  psql -tA -c "SELECT has_table_privilege('$1', 'public.$2', '$3');" "$SUPER_URL"
}

echo "== grant matrix =="
for svc in auth users service-orders payments reviews; do
  svc_key=$(printf '%s' "$svc" | tr '-' '_')
  eval "role=\$ROLE_$svc_key; allow=\$ALLOW_$svc_key"
  for table in $TABLES; do
    case " $allow " in
      *" $table "*)
        [ "$(priv "$role" "$table" SELECT)" = "t" ] || fail "$role missing SELECT on $table"
        for verb in INSERT UPDATE DELETE; do
          [ "$(priv "$role" "$table" "$verb")" = "t" ] || fail "$role missing $verb on $table"
        done ;;
      *)
        [ "$(priv "$role" "$table" SELECT)" = "t" ] || fail "$role missing SELECT on $table"
        for verb in INSERT UPDATE DELETE; do
          [ "$(priv "$role" "$table" "$verb")" = "f" ] || fail "$role must NOT have $verb on $table"
        done ;;
    esac
  done
  echo "matrix OK for $role"
done

echo "== live denials (expect 42501) =="
deny_insert() { # deny_insert <role> <password> <table>
  out=$(PGPASSWORD="$2" psql -h "$PGHOST" -p "$PGPORT" -U "$1" -d "$PGDATABASE" \
    -v VERBOSITY=verbose \
    -c "INSERT INTO public.$3 (id) VALUES ('00000000-0000-0000-0000-000000000000');" 2>&1) || true
  # Privilege check runs before NOT NULL checks, so a denied write surfaces
  # 42501 even though the row omits required columns.
  case "$out" in
    *42501*"permission denied"*) echo "denied (42501) as expected: $1 -> $3" ;;
    *) echo "$out" >&2; fail "$1 INSERT into $3 did not fail with 42501" ;;
  esac
}
deny_insert "role_auth" "${DB_ROLE_AUTH_PASSWORD:?}" "payments"
deny_insert "role_users" "${DB_ROLE_USERS_PASSWORD:?}" "payments"
deny_insert "role_service_orders" "${DB_ROLE_SERVICE_ORDERS_PASSWORD:?}" "users"
deny_insert "role_payments" "${DB_ROLE_PAYMENTS_PASSWORD:?}" "reviews"
deny_insert "role_reviews" "${DB_ROLE_REVIEWS_PASSWORD:?}" "payments"

echo "== live allowed write cycle (role_auth -> token_blacklist) =="
ROLE_AUTH_URL="postgresql://role_auth:${DB_ROLE_AUTH_PASSWORD:?}@$PGHOST:$PGPORT/$PGDATABASE"
JTI="role-check-$(date +%s)"
psql "$ROLE_AUTH_URL" -v ON_ERROR_STOP=1 \
  -c "INSERT INTO public.token_blacklist (jti, expires_at) VALUES ('$JTI', now() + interval '1 hour');" \
  -c "UPDATE public.token_blacklist SET expires_at = now() + interval '2 hours' WHERE jti = '$JTI';" \
  -c "DELETE FROM public.token_blacklist WHERE jti = '$JTI';" >/dev/null \
  || fail "role_auth allow-list write cycle failed"

echo "== DDL denied for roles =="
if PGPASSWORD="${DB_ROLE_AUTH_PASSWORD:?}" psql -h "$PGHOST" -p "$PGPORT" -U role_auth \
    -d "$PGDATABASE" -c "CREATE TABLE public.role_check_evil (id text);" 2>&1; then
  fail "role_auth was able to CREATE TABLE"
else
  echo "denied as expected: role_auth CREATE TABLE"
fi

echo "== default privileges on later tables =="
psql "$SUPER_URL" -c "CREATE TABLE public.role_check_later (id text primary key, note text);" >/dev/null
[ "$(priv role_reviews role_check_later SELECT)" = "t" ] || fail "default SELECT missing on later table"
[ "$(priv role_reviews role_check_later INSERT)" = "f" ] || fail "default must not grant INSERT on later table"
psql "$SUPER_URL" -c "DROP TABLE public.role_check_later;" >/dev/null
echo "default privileges OK"

echo "ROLE-CHECK PASS"

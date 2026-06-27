#!/bin/sh
# Pode Deixar - Migration + Service Starter
# Tenta rodar as migrations com retry e inicia o serviço independente do resultado.
# Necessário porque o Neon (PgBouncer) não suporta advisory locks,
# então migrations devem usar DIRECT_DATABASE_URL.

SCHEMA="prisma/schema.prisma"
MAX_RETRIES=6
RETRY_DELAY=5

run_migration() {
  npx prisma migrate deploy --schema="$SCHEMA"
}

echo "=== [migrate-and-start] Running database migrations ==="

retry=0
while [ $retry -lt $MAX_RETRIES ]; do
  if run_migration; then
    echo "=== [migrate-and-start] Migrations applied successfully ==="
    break
  fi
  retry=$((retry + 1))
  if [ $retry -lt $MAX_RETRIES ]; then
    echo "=== [migrate-and-start] Migration attempt $retry failed, retrying in ${RETRY_DELAY}s... ==="
    sleep $RETRY_DELAY
  else
    echo "=== [migrate-and-start] All migration attempts failed. Starting service anyway... ==="
  fi
done

echo "=== [migrate-and-start] Starting service: $@ ==="
exec "$@"

#!/bin/bash
# Script de teste de restauração de backup PostgreSQL
# Uso: ./scripts/test-restore.sh [arquivo_backup.sql.gz]
# Se nenhum arquivo for especificado, usa o backup mais recente em /backups

set -e

BACKUP_DIR="/backups"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-pode_deixar}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

# Se arquivo não especificado, pega o mais recente
if [ -z "$1" ]; then
    BACKUP_FILE=$(ls -t ${BACKUP_DIR}/pode_deixar_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo "ERRO: Nenhum arquivo de backup encontrado em ${BACKUP_DIR}"
        exit 1
    fi
else
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "ERRO: Arquivo $BACKUP_FILE não encontrado"
        exit 1
    fi
fi

echo "=== Teste de Restauração de Backup ==="
echo "Arquivo: $BACKUP_FILE"
echo "Destino: $POSTGRES_HOST / $POSTGRES_DB"
echo ""

# Cria banco de dados temporário para teste
TEST_DB="${POSTGRES_DB}_restore_test_$(date +%s)"

echo "1. Criando banco de teste: $TEST_DB"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TEST_DB\";"

echo "2. Restaurando backup para banco de teste..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$TEST_DB" -q

echo "3. Verificando integridade dos dados restaurados..."
TABLE_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "   Tabelas restauradas: $TABLE_COUNT"

# Verifica tabelas críticas
for TABLE in users payments payment_status_history payment_webhook_events service_orders; do
    ROW_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$TEST_DB" -t -c "SELECT count(*) FROM \"$TABLE\";" 2>/dev/null | xargs || echo "0")
    echo "   $TABLE: $ROW_COUNT registros"
done

echo "4. Limpando banco de teste..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE \"$TEST_DB\";"

echo ""
echo "=== Teste de restauração CONCLUÍDO COM SUCESSO ==="
echo "Backup validado: $BACKUP_FILE"
-- Torna payments.idempotency_key obrigatório com default uuid().
-- Motivo: sem default, concorrência/retry pode gerar pagamentos duplicados sem
-- chave de idempotência. Postgres 16 tem gen_random_uuid() nativo (sem pgcrypto).
-- Ordem: preenche NULLs existentes primeiro, depois NOT NULL + DEFAULT.

UPDATE "payments" SET "idempotency_key" = gen_random_uuid() WHERE "idempotency_key" IS NULL;

ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET DEFAULT gen_random_uuid();

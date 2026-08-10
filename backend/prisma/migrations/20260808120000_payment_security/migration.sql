-- Payment security: moeda e idempotência (idempotente para reexecução)

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BRL';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_service_order_id_idempotency_key_key"
  ON "payments"("service_order_id", "idempotency_key");

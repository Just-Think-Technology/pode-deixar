-- Payment security: moeda e idempotência

-- Currency (BRL por padrão)
ALTER TABLE "payments" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL';

-- Idempotency key única por pedido (evita pagamento duplicado em reprocessing)
ALTER TABLE "payments" ADD COLUMN "idempotency_key" TEXT;

-- Unique composto: um pagamento por (pedido, chave de idempotência)
CREATE UNIQUE INDEX "payments_service_order_id_idempotency_key_key" ON "payments"("service_order_id", "idempotency_key");
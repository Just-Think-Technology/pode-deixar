-- Histórico de alterações de status do pagamento

CREATE TABLE IF NOT EXISTS "payment_status_history" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "status_anterior" TEXT,
    "status_novo" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_status_history_payment_id_created_at_idx"
  ON "payment_status_history"("payment_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_status_history_payment_id_fkey'
  ) THEN
    ALTER TABLE "payment_status_history"
      ADD CONSTRAINT "payment_status_history_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

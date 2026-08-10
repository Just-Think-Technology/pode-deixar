-- Webhook events: registro idempotente de notificações de gateway

CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_gateway_event_id_key"
  ON "payment_webhook_events"("gateway", "event_id");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_payment_id_idx"
  ON "payment_webhook_events"("payment_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_webhook_events_payment_id_fkey'
  ) THEN
    ALTER TABLE "payment_webhook_events"
      ADD CONSTRAINT "payment_webhook_events_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "service_orders" ADD COLUMN "started_at" TIMESTAMP(3), ADD COLUMN "cancelled_at" TIMESTAMP(3), ADD COLUMN "cancel_reason" TEXT;
CREATE TABLE "order_timeline_events" ("id" TEXT PRIMARY KEY, "service_order_id" TEXT NOT NULL REFERENCES "service_orders"("id") ON DELETE CASCADE, "event_key" TEXT NOT NULL, "from_status" TEXT, "to_status" TEXT, "actor_id" TEXT, "reason" TEXT, "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "order_timeline_events_service_order_id_created_at_idx" ON "order_timeline_events"("service_order_id", "created_at");

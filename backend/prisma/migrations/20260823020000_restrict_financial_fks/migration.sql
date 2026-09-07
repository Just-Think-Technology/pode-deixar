-- Troca ON DELETE CASCADE por RESTRICT nas FKs financeiras e de avaliação.
-- Motivo: apagar um pedido nunca deve apagar silenciosamente pagamentos,
-- eventos de webhook, histórico de status ou avaliações (trilha de auditoria).
-- Nomes das constraints verificados nas migrations originais:
-- 20260807000000_add_payments (3 FKs) e 20260816010000_add_reviews (1 FK).
-- ON UPDATE CASCADE preservado como antes.

ALTER TABLE "payments" DROP CONSTRAINT "payments_service_order_id_fkey";
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_service_order_id_fkey"
  FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_webhook_events" DROP CONSTRAINT "payment_webhook_events_payment_id_fkey";
ALTER TABLE "payment_webhook_events"
  ADD CONSTRAINT "payment_webhook_events_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_status_history" DROP CONSTRAINT "payment_status_history_payment_id_fkey";
ALTER TABLE "payment_status_history"
  ADD CONSTRAINT "payment_status_history_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews" DROP CONSTRAINT "reviews_service_order_id_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_service_order_id_fkey"
  FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

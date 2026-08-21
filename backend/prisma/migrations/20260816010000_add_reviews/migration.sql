-- Avaliações (reviews) entre clientes e prestadores

-- Nota agregada no perfil do cliente (avaliado pelos prestadores)
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "total_reviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: reviews
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique (service_order_id, reviewer_id) — 1 avaliação por pedido por autor
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_service_order_id_reviewer_id_key"
  ON "reviews"("service_order_id", "reviewer_id");

-- CreateIndex: reviewee_id (listagem por alvo)
CREATE INDEX IF NOT EXISTS "reviews_reviewee_id_idx"
  ON "reviews"("reviewee_id");

-- AddForeignKey: reviews.service_order_id -> service_orders.id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_service_order_id_fkey') THEN
    ALTER TABLE "reviews"
      ADD CONSTRAINT "reviews_service_order_id_fkey"
      FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
-- CreateTable
CREATE TABLE "order_photos" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_photos" ADD CONSTRAINT "order_photos_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

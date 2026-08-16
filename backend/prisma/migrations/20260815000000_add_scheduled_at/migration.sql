-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "scheduled_at" TIMESTAMP(3),
ADD COLUMN "scheduled_end_at" TIMESTAMP(3);

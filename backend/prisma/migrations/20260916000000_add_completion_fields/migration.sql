-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "completed_by" TEXT,
ADD COLUMN "observations" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "fee_rate" DECIMAL(10,4),
ADD COLUMN "fee_amount" DECIMAL(10,2),
ADD COLUMN "net_amount" DECIMAL(10,2);

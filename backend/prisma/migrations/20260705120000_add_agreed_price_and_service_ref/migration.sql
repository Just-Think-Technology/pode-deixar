-- Add provider_service_id and agreed_price for direct hiring
ALTER TABLE "service_orders" ADD COLUMN "provider_service_id" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "agreed_price" DECIMAL(10,2);

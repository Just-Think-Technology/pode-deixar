-- Add provider_id to service_orders (optional, for direct requests to specific providers)
ALTER TABLE "service_orders" ADD COLUMN "provider_id" TEXT;

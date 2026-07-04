-- CreateCategoryTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- Insert default categories
INSERT INTO "categories" ("id", "name", "slug", "description", "icon", "order", "updated_at") VALUES
  (gen_random_uuid()::text, 'Elétrica', 'eletrica', 'Serviços de elétrica residencial e comercial', 'zap', 1, NOW()),
  (gen_random_uuid()::text, 'Hidráulica', 'hidraulica', 'Serviços de hidráulica e encanamento', 'droplets', 2, NOW()),
  (gen_random_uuid()::text, 'Pintura', 'pintura', 'Pintura residencial e predial', 'paintbrush', 3, NOW()),
  (gen_random_uuid()::text, 'Reforma', 'reforma', 'Reformas e construção em geral', 'wrench', 4, NOW()),
  (gen_random_uuid()::text, 'Limpeza', 'limpeza', 'Serviços de limpeza residencial e comercial', 'sparkles', 5, NOW()),
  (gen_random_uuid()::text, 'Jardinagem', 'jardinagem', 'Serviços de jardinagem e paisagismo', 'leaf', 6, NOW()),
  (gen_random_uuid()::text, 'Marcenaria', 'marcenaria', 'Móveis planejados e reparos em madeira', 'hammer', 7, NOW()),
  (gen_random_uuid()::text, 'Vidraçaria', 'vidracaria', 'Vidros e espelhos', 'glass-water', 8, NOW()),
  (gen_random_uuid()::text, 'Telhado', 'telhado', 'Telhados, lajes e coberturas', 'building', 9, NOW()),
  (gen_random_uuid()::text, 'Dedetização', 'dedetizacao', 'Controle de pragas e dedetização', 'bug', 10, NOW()),
  (gen_random_uuid()::text, 'Mudanças', 'mudancas', 'Mudanças residenciais e comerciais', 'truck', 11, NOW()),
  (gen_random_uuid()::text, 'Chaveiro', 'chaveiro', 'Abertura de portas e troca de fechaduras', 'key', 12, NOW()),
  (gen_random_uuid()::text, 'Informática', 'informatica', 'Manutenção de computadores e redes', 'monitor', 13, NOW()),
  (gen_random_uuid()::text, 'Serviços Gerais', 'servicos-gerais', 'Outros serviços não categorizados', 'more-horizontal', 14, NOW());

-- Add category_id column (nullable initially for migration)
ALTER TABLE "provider_services" ADD COLUMN "category_id" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "category_id" TEXT;

-- Migrate existing data: link to first category as default
UPDATE "provider_services" SET "category_id" = (SELECT "id" FROM "categories" ORDER BY "order" LIMIT 1) WHERE "category_id" IS NULL;
UPDATE "service_orders" SET "category_id" = (SELECT "id" FROM "categories" ORDER BY "order" LIMIT 1) WHERE "category_id" IS NULL;

-- Make NOT NULL
ALTER TABLE "provider_services" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "service_orders" ALTER COLUMN "category_id" SET NOT NULL;

-- Add foreign keys
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old category column and index (IF EXISTS for service_orders which may be created fresh)
ALTER TABLE "provider_services" DROP COLUMN IF EXISTS "category";
ALTER TABLE "service_orders" DROP COLUMN IF EXISTS "category";
DROP INDEX IF EXISTS "provider_services_category_idx";

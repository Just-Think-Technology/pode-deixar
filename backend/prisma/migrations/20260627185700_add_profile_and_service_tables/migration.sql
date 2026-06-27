-- CreateTable: client_profiles
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "avatar_url" TEXT,
    "preferences" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: provider_profiles
CREATE TABLE "provider_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "hourly_rate" DECIMAL(10,2),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolio" JSONB DEFAULT '[]',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: provider_services
CREATE TABLE "provider_services" (
    "id" TEXT NOT NULL,
    "provider_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fixed_price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique user_id on client_profiles
CREATE UNIQUE INDEX "client_profiles_user_id_key" ON "client_profiles"("user_id");

-- CreateIndex: unique user_id on provider_profiles
CREATE UNIQUE INDEX "provider_profiles_user_id_key" ON "provider_profiles"("user_id");

-- CreateIndex: provider_profile_id on provider_services (for joins)
CREATE INDEX "provider_services_provider_profile_id_idx" ON "provider_services"("provider_profile_id");

-- CreateIndex: category on provider_services (for search)
CREATE INDEX "provider_services_category_idx" ON "provider_services"("category");

-- AddForeignKey: client_profiles.user_id -> users.id
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: provider_profiles.user_id -> users.id
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: provider_services.provider_profile_id -> provider_profiles.id
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_profile_id_fkey" FOREIGN KEY ("provider_profile_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

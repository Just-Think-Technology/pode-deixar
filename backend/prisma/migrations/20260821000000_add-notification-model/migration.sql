-- Migration: add-notification-model
-- Created: 2026-08-21

CREATE TABLE "notifications" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "recipient" VARCHAR(191) NOT NULL,
  "type" VARCHAR(191) NOT NULL,
  "title" VARCHAR(191) NOT NULL,
  "message" TEXT NOT NULL,
  "related_id" VARCHAR(191),
  "related_type" VARCHAR(191),
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

  UNIQUE ("recipient", "read", "created_at")
);

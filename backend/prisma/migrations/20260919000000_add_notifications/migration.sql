/*
  Warnings:

  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `read` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `recipient` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `related_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `related_type` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `created_at` on table `order_timeline_events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_active` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONVERSATION', 'SERVICE');

-- DropForeignKey
ALTER TABLE "order_timeline_events" DROP CONSTRAINT "order_timeline_events_service_order_id_fkey";

-- DropConstraint (fix: was DROP INDEX on a UNIQUE CONSTRAINT)
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_recipient_read_created_at_key";

-- DropIndex
DROP INDEX "payment_webhook_events_payment_id_idx";

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey",
DROP COLUMN "read",
DROP COLUMN "recipient",
DROP COLUMN "related_id",
DROP COLUMN "related_type",
DROP COLUMN "updated_at",
ADD COLUMN     "contract_id" TEXT,
ADD COLUMN     "conversation_id" TEXT,
ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "notifications_id_seq";

-- AlterTable
ALTER TABLE "order_timeline_events" ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "is_active" SET NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_type_idx" ON "notifications"("user_id", "type");

-- AddForeignKey
ALTER TABLE "order_timeline_events" ADD CONSTRAINT "order_timeline_events_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

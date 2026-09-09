import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(
    __dirname,
    `../../../.env.${process.env.NODE_ENV || "development"}`,
  ),
});

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pode_deixar_test_e2e?schema=public';

const TABELAS = [
  'payment_status_history',
  'payment_webhook_events',
  'payments',
  'reviews',
  'counter_proposals',
  'proposals',
  'order_photos',
  'service_orders',
  'service_images',
  'provider_services',
  'notifications',
  'client_profiles',
  'provider_profiles',
  'categories',
  'token_blacklist',
  'users',
];

export default async function globalTeardown() {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    // CASCADE handles the FKs; a single pass cleans the shared database.
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${TABELAS.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  } catch (_) {}
  await prisma.$disconnect();
}

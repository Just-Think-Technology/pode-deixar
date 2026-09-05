import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.staging') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pode_deixar_test?schema=public';

export default async function globalTeardown() {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.tokenBlacklist.deleteMany();
    await prisma.providerService.deleteMany();
    await prisma.providerProfile.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.user.deleteMany();
  } catch (_) {}
  await prisma.$disconnect();
}
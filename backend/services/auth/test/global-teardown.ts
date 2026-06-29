import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.staging') });

export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try { await prisma.tokenBlacklist.deleteMany(); } catch (_) {}
  await prisma.providerService.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}
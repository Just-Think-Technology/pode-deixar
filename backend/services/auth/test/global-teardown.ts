import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.staging') });

export default async function globalTeardown() {
  const prisma = new PrismaClient();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}
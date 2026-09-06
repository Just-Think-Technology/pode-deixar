import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.resolve(
    __dirname,
    `../../../../.env.${process.env.NODE_ENV || "development"}`,
  ),
});

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pode_deixar_test_service-orders?schema=public';

export default async function globalTeardown() {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    // Ordem respeita as FKs (filhos antes dos pais).
    await prisma.paymentStatusHistory.deleteMany().catch(() => {});
    await prisma.paymentWebhookEvent.deleteMany().catch(() => {});
    await prisma.payment.deleteMany().catch(() => {});
    await prisma.review.deleteMany().catch(() => {});
    await prisma.counterProposal.deleteMany().catch(() => {});
    await prisma.proposal.deleteMany().catch(() => {});
    await prisma.orderPhoto.deleteMany().catch(() => {});
    await prisma.serviceOrder.deleteMany().catch(() => {});
    await prisma.serviceImage.deleteMany().catch(() => {});
    await prisma.providerService.deleteMany().catch(() => {});
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.clientProfile.deleteMany().catch(() => {});
    await prisma.providerProfile.deleteMany().catch(() => {});
    await prisma.category.deleteMany().catch(() => {});
    await prisma.tokenBlacklist.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
  } catch (_) {}
  await prisma.$disconnect();
}

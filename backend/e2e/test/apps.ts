import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule as UsersAppModule } from '../../services/users/src/app.module';
import { MinioService as UsersMinioService } from '../../services/users/src/storage/minio.service';
import { AppModule as OrdersAppModule } from '../../services/service-orders/src/app.module';
import { MinioService as OrdersMinioService } from '../../services/service-orders/src/storage/minio.service';
import { AppModule as PaymentsAppModule } from '../../services/payments/src/app.module';
import { AppModule as ReviewsAppModule } from '../../services/reviews/src/app.module';

// --- Types ---

export type TestRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface E2EApps {
  usersApp: INestApplication;
  ordersApp: INestApplication;
  paymentsApp: INestApplication;
  reviewsApp: INestApplication;
  prisma: PrismaClient;
}

// --- MinIO stub ---
// Os MinioServices reais conectam no onModuleInit — inviável sem MinIO.
// A jornada e2e não envia arquivos; o stub só destrava o boot.

export const mockMinio = {
  avatarBucket: 'avatars',
  uploadFile: jest.fn(
    async (fileName: string, _buffer: Buffer, _mime: string, bucket?: string) =>
      `http://minio.test/${bucket ?? 'bucket'}/${fileName}`,
  ),
  deleteFile: jest.fn(async (_fileName: string, _bucket?: string) => undefined),
  extractFileName: jest.fn(
    (url: string, bucket?: string) =>
      url.split(`/${bucket ?? 'bucket'}/`).pop() as string,
  ),
};

// --- Boot ---

async function bootApp(
  appModule: any,
  minioClass?: any,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [
      appModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
    ],
  });
  if (minioClass) {
    builder = builder.overrideProvider(minioClass).useValue(mockMinio);
  }
  const moduleFixture: TestingModule = await builder.compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

/**
 * Sobe os 4 serviços no mesmo processo (supertest dispensa listen, sem
 * conflito de portas) contra o MESMO banco — a topologia real de produção.
 */
export async function bootApps(): Promise<E2EApps> {
  const [usersApp, ordersApp, paymentsApp, reviewsApp] = await Promise.all([
    bootApp(UsersAppModule, UsersMinioService),
    bootApp(OrdersAppModule, OrdersMinioService),
    bootApp(PaymentsAppModule),
    bootApp(ReviewsAppModule),
  ]);

  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/pode_deixar_test_e2e?schema=public';
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  await prisma.$connect();

  return { usersApp, ordersApp, paymentsApp, reviewsApp, prisma };
}

export async function shutdownApps(apps: E2EApps): Promise<void> {
  await apps.prisma.$disconnect();
  await Promise.all([
    apps.usersApp.close(),
    apps.ordersApp.close(),
    apps.paymentsApp.close(),
    apps.reviewsApp.close(),
  ]);
}

// --- Helpers ---

export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{
    completeName: string;
    email: string;
    role: TestRole;
  }> = {},
) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return prisma.user.create({
    data: {
      completeName: overrides.completeName ?? 'Test User',
      email: overrides.email ?? `test_${suffix}@example.com`,
      password: 'test-hash-nao-usado',
      phone: '+1234567890',
      postalCode: '12345-678',
      role: overrides.role ?? 'CLIENT',
    },
  });
}

export function mintToken(user: { id: string; email: string; role: string }) {
  const secret = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
  return new JwtService({ secret }).sign({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
}

export const bearerAuth = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export async function createCategory(prisma: PrismaClient) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return prisma.category.create({
    data: { name: `Cat ${suffix}`, slug: `cat-${suffix}` },
  });
}

export { request };

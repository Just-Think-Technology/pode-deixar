// E2E app boot — multi-service test harness and helpers

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule as UsersAppModule } from '../../services/users/src/app.module';
import { MinioService as UsersMinioService } from '../../services/users/src/storage/minio.service';
import { AppModule as OrdersAppModule } from '../../services/service-orders/src/app.module';
import { MinioService as OrdersMinioService } from '../../services/service-orders/src/storage/minio.service';
import { AppModule as PaymentsAppModule } from '../../services/payments/src/app.module';
import { AppModule as ReviewsAppModule } from '../../services/reviews/src/app.module';
import { AppModule as AuthAppModule } from '../../services/auth/src/app.module';
import { EmailService } from '@pode-deixar/email';

// --- Types ---

export type TestRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface E2EApps {
  usersApp: INestApplication;
  ordersApp: INestApplication;
  paymentsApp: INestApplication;
  reviewsApp: INestApplication;
  prisma: PrismaClient;
}

// --- Email Mock ---
// The real EmailService would send SMTP — unfeasible without a mail server.

export const mockEmail = {
  sendEmailVerification: jest.fn(async () => true),
  sendPasswordReset: jest.fn(async () => true),
};

// --- MinIO stub ---
// The real MinioServices connect on onModuleInit — unfeasible without MinIO.
// The e2e journey uploads no files; the stub only unblocks boot.

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
  // Sensitive endpoints carry strict @Throttle (5 req/min); e2e journeys share
  // one IP and would hit 429. Fake storage that never blocks — the real
  // guard still runs.
  builder = builder
    .overrideProvider(ThrottlerStorage)
    .useValue({
      increment: async () => ({
        totalHits: 1,
        timeToExpire: 60000,
        timeToBlockExpire: 0,
        isBlocked: false,
      }),
    });
  const moduleFixture: TestingModule = await builder.compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

/**
 * Boots the 4 services in the same process (supertest needs no listen, so no
 * port conflicts) against the SAME database — the real production topology.
 *
 * WARNING — passport singleton: `@nestjs/passport` shares the strategy
 * registry per process. Every service registers its JwtStrategy under the
 * default 'jwt' name and the LAST registration wins globally. The 4 services
 * below return the same `{ sub, email, role, ... }` shape, so any winner is
 * equivalent. The auth-service, however, returns `{ id, ... }` WITHOUT
 * `sub` — so it must NEVER boot last (see bootAuthApp). This doesn't exist
 * in production, where each service runs in its own process.
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

/**
 * Boots only the auth-service (with mocked EmailService — no SMTP).
 * Separate from bootApps for journeys that skip signup.
 *
 * GOLDEN RULE: boot auth BEFORE the other apps (see the passport-singleton
 * comment in bootApps). The journey endpoints (register/verify/login) are
 * public and don't depend on the active strategy.
 */
export async function bootAuthApp(): Promise<INestApplication> {
  // Boot validates JWT secrets fail-closed (>=32 chars); ensure adequate test
  // secrets without relying on .env contents.
  if (
    !process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_ACCESS_SECRET.length < 32
  ) {
    process.env.JWT_ACCESS_SECRET =
      'teste-access-secret-com-32-chars-minimo-0123456789abcdef';
  }
  if (
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.length < 32
  ) {
    process.env.JWT_REFRESH_SECRET =
      'teste-refresh-secret-com-32-chars-minimo-0123456789abcdef';
  }
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      AuthAppModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
    ],
  })
    .overrideProvider(EmailService)
    .useValue(mockEmail)
    // See bootApp above — fake storage avoids 429.
    .overrideProvider(ThrottlerStorage)
    .useValue({
      increment: async () => ({
        totalHits: 1,
        timeToExpire: 60000,
        timeToBlockExpire: 0,
        isBlocked: false,
      }),
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
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

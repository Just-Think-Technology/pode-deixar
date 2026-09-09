import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/storage/minio.service';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';

// --- Types ---

export type TestRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface TestAppSetup {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// --- MinIO stub ---
// The real MinioService connects on onModuleInit — unfeasible without MinIO.
// Substitui o comportamento de rede, mantendo o contrato usado pelos services.

export const mockMinio = {
  avatarBucket: 'avatars',
  uploadFile: jest.fn(
    async (fileName: string, _buffer: Buffer, _mime: string, bucket?: string) =>
      `http://minio.test/${bucket ?? 'avatars'}/${fileName}`,
  ),
  deleteFile: jest.fn(async (_fileName: string, _bucket?: string) => undefined),
  extractFileName: jest.fn(
    (url: string, bucket?: string) =>
      url.split(`/${bucket ?? 'avatars'}/`).pop() as string,
  ),
};

/**
 * Boots the real Nest app (validation pipeline, guards and production filters).
 * - Stubbed MinioService (no network).
 * - High-limit throttle so it doesn't interfere with tests.
 */
export async function setupTestApp(): Promise<TestAppSetup> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      AppModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
    ],
  })
    .overrideProvider(MinioService)
    .useValue(mockMinio)
    // Sensitive endpoints carry strict @Throttle (5 req/min); test flows share
    // one IP and would hit 429. Fake storage that never blocks — the real
    // guard still runs.
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

  const prisma = moduleFixture.get(PrismaService);

  return { app, prisma };
}

/**
 * Creates a user directly in the database (bypasses the auth-service).
 * Unique emails avoid collisions between parallel suites.
 */
export async function createTestUser(
  prisma: PrismaService,
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

/**
 * Mints a valid JWT for the guards (same secret as .env.test).
 */
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

export async function teardownTestApp(
  app: INestApplication,
  prisma: PrismaService,
): Promise<void> {
  await prisma.$disconnect();
  await app.close();
}


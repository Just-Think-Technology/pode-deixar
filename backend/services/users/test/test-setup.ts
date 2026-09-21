// --- Setup ---
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from "@pode-deixar/prisma";
import { MinioService, StorageService } from '@pode-deixar/storage';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';

// --- Types ---

export type TestRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface TestAppSetup {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// --- Storage stub (SeaweedFS S3, MINIO alias kept for backward compat) ---
// The real StorageService connects on onModuleInit — unfeasible without SeaweedFS.
// Mocks network behavior while keeping the service contract.

export const mockMinio = {
  avatarBucket: 'avatars',
  uploadFile: jest.fn(
    async (fileName: string, _buffer: Buffer, _mime: string, bucket?: string) =>
      `http://seaweedfs.test/${bucket ?? 'avatars'}/${fileName}`,
  ),
  deleteFile: jest.fn(async (_fileName: string, _bucket?: string) => undefined),
  extractFileName: jest.fn(
    (url: string, bucket?: string) =>
      url.split(`/${bucket ?? 'avatars'}/`).pop() as string,
  ),
  generateTemporaryUrl: jest.fn(
    async (fileName: string, bucket?: string) =>
      `http://seaweedfs.test/${bucket ?? 'avatars'}/${fileName}?X-Amz-Signature=mock`,
  ),
};
export const mockStorage = mockMinio;

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
    .overrideProvider(StorageService)
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
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready', 'health/live'] });
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
  const { randomUUID } = require('crypto');
  return new JwtService({ secret }).sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
      type: 'access',
    },
    {
      issuer: 'pode-deixar-auth',
      audience: 'pode-deixar',
    },
  );
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


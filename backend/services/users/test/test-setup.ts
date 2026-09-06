import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinioService } from '../src/storage/minio.service';
import { ThrottlerModule } from '@nestjs/throttler';

// --- Types ---

export type TestRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface TestAppSetup {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// --- MinIO stub ---
// O MinioService real conecta no onModuleInit — inviável sem MinIO.
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

// --- App Lifecycle ---

/**
 * Sobe o app Nest real (pipeline de validação, guards e filtros de produção).
 * - MinioService com stub (sem rede).
 * - Throttle com limite alto para não interferir nos testes.
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
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const prisma = moduleFixture.get(PrismaService);

  return { app, prisma };
}

// --- Factories ---

/**
 * Cria um usuário direto no banco (bypassa o auth-service).
 * Emails únicos evitam colisão entre suites paralelas.
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
 * Emite um JWT válido para os guards (mesmo segredo do .env.test).
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


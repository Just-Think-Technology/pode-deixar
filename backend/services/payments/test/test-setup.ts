import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from "@pode-deixar/prisma";
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';

// --- Types ---

export type TestRole = 'CLIENT' | 'PROVIDER' | 'ADMIN';

export interface TestAppSetup {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// --- App Lifecycle ---

export async function setupTestApp(): Promise<TestAppSetup> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      AppModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
    ],
  })
    // Sensitive endpoints carry strict @Throttle (5-60 req/min); test flows
    // share one IP and would hit 429. Fake storage that never blocks — the
    // real guard still runs.
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

// --- Factories ---

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

export async function createCategory(prisma: PrismaService) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return prisma.category.create({
    data: { name: `Cat ${suffix}`, slug: `cat-${suffix}` },
  });
}

export async function createOrder(
  prisma: PrismaService,
  clientId: string,
  categoryId: string,
  agreedPrice = 150,
) {
  return prisma.serviceOrder.create({
    data: {
      title: 'Pedido para pagamento',
      description: 'Descrição do pedido para pagamento',
      categoryId,
      clientId,
      agreedPrice,
      status: 'OPEN',
    },
  });
}

export async function teardownTestApp(
  app: INestApplication,
  prisma: PrismaService,
): Promise<void> {
  await prisma.$disconnect();
  await app.close();
}


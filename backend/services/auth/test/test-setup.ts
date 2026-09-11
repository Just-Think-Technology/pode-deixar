import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@pode-deixar/prisma';
import { EmailService } from '@pode-deixar/email';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';

export interface TestUser {
  complete_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  postal_code: string;
  role: 'CLIENT' | 'PROVIDER' | 'ADMIN';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TestAppSetup {
  app: INestApplication<App>;
  prisma: PrismaService;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  complete_name: 'Test User',
  email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
  password: 'TestPassword123!',
  confirm_password: 'TestPassword123!',
  phone: '+1234567890',
  postal_code: '12345-678',
  role: 'CLIENT',
  ...overrides,
});

export const createProviderUser = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({ complete_name: 'Provider User', role: 'PROVIDER', ...overrides });

export const createAdminUser = (overrides: Partial<TestUser> = {}): TestUser =>
  createTestUser({ complete_name: 'Admin User', role: 'ADMIN', ...overrides });

export async function setupTestApp(): Promise<TestAppSetup> {
  // Boot validates JWT secrets fail-closed (>=32 chars); ensure adequate test secrets without relying on .env contents.
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

  const moduleFixture = await Test.createTestingModule({
    imports: [
      AppModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10_000 }]),
    ],
  })
    .overrideProvider(EmailService)
    .useValue({
      sendEmailVerification: jest.fn().mockResolvedValue(true),
      sendPasswordReset: jest.fn().mockResolvedValue(true),
    })
    // Sensitive endpoints throttle strictly (5 req/min); functional flows share one IP and would hit 429, so a fake storage never blocks while the real guard still runs (overrideGuard does not cover per-route @Throttle in this @nestjs/throttler version).
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const prisma = moduleFixture.get(PrismaService);

  return { app, prisma };
}

export async function registerUser(
  app: INestApplication,
  user: TestUser,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201);
}

/**
 * Reads the raw verification token and calls the verify-email endpoint.
 * The DB stores only the token sha256, so tests use the raw token from the non-prod signup echo (the same value the user would receive by email).
 */
export async function verifyEmailViaApi(
  app: INestApplication,
  email: string,
  prisma?: PrismaService,
  rawToken?: string,
): Promise<void> {
  if (!rawToken) {
    const db: PrismaService = prisma ?? app.get(PrismaService);
    const existing = await db.user.findUnique({ where: { email } });
    if (!existing)
      throw new Error(`[verifyEmailViaApi] User not found: ${email}`);
    throw new Error(
      '[verifyEmailViaApi] token bruto ausente: informe o ' +
        'email_verification_token retornado pelo cadastro (o banco guarda ' +
        'apenas o hash do token).',
    );
  }

  await request(app.getHttpServer())
    .post('/auth/verify-email')
    .send({ token: rawToken })
    .expect(200);
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
}

export async function registerAndLogin(
  app: INestApplication,
  user: TestUser,
  prisma?: PrismaService,
): Promise<AuthTokens> {
  const registration = await registerUser(app, user);
  // The DB stores only the hash; verify with the raw token from the non-prod echo (the link the user would receive by email).
  await verifyEmailViaApi(
    app,
    user.email,
    prisma,
    registration.body.email_verification_token as string,  );

  const loginResponse = await loginUser(app, user.email, user.password);

  return {
    accessToken: loginResponse.body.access_token as string,
    refreshToken: loginResponse.body.refresh_token as string,
  };
}

/**
 * Elevates an existing user to ADMIN role directly in the DB.
 * Useful for tests that need admin access without going through a separate
 * admin-creation flow.
 */
export async function promoteToAdmin(
  prisma: PrismaService,
  email: string,
): Promise<void> {
  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
    select: { role: true },
  });

  if (updated.role !== 'ADMIN') {
    throw new Error(
      `[promoteToAdmin] Failed to promote ${email} — role is still ${updated.role}`,
    );
  }
}

/**
 * Returns a bearer-auth header object for use with supertest's .set().
 */
export const bearerAuth = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export async function teardownTestApp(
  app: INestApplication,
  prisma: PrismaService,
): Promise<void> {
  await prisma.$disconnect(); // fecha conexão com banco
  await app.close();          // fecha HTTP server do Nest
}
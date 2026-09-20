// Login service tests — HTTP + DB observable state (supertest with real DB)

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  setupTestApp,
  createTestUser,
  registerUser,
  verifyEmailViaApi,
  teardownTestApp,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';
import { EmailService } from '@pode-deixar/email';

// --- Tests ---

describe('LoginService (integration via HTTP + DB)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  afterAll(async () => {
    await teardownTestApp(app, prisma);
  });

  describe('POST /auth/login — success and observable DB state', () => {
    it('should return tokens and reset login state in DB on valid credentials', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      expect(dbUser?.failedLoginAttempts).toBe(0);
      expect(dbUser?.lockoutUntil).toBeNull();
      expect(dbUser?.refreshToken).toBeTruthy();
      expect(dbUser?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should reject unknown email with generic 401 (no enumeration oracle)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unknown-xyz@example.com', password: 'AnyPassword123!' })
        .expect(401);

      expect(response.body.message).toContain('Credenciais inválidas');
    });

    it('should reject a locked account with generic 401 without revealing lockout', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      const lockoutUntil = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.user.update({
        where: { id: dbUser!.id },
        data: { lockoutUntil, failedLoginAttempts: 5 },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);

      expect(response.body.message).toContain('Credenciais inválidas');
    });

    it('should increment failedLoginAttempts on wrong password (observable in DB)', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'WrongPassword123!' })
        .expect(401);

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      expect(dbUser?.failedLoginAttempts).toBe(1);
      expect(dbUser?.lockoutUntil).toBeNull();
    });

    it('should lock the account at max attempts (5 fails -> lockoutUntil set)', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );

      for (let i = 0; i < 5; i += 1) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: user.email, password: 'WrongPassword123!' })
          .expect(401);
      }

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      expect(dbUser?.failedLoginAttempts).toBe(5);
      expect(dbUser?.lockoutUntil).toBeInstanceOf(Date);
      expect(dbUser!.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());

      // Even correct password must fail while locked
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);
    });

    it('should reject unverified email with generic 401 and rotate verification hint in DB', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      const initialHash = (
        await prisma.user.findUnique({ where: { email: user.email } })
      )?.emailVerificationToken;

      const emailMock = app.get(EmailService) as unknown as { sendEmailVerification: jest.Mock };
      const callsBefore = emailMock.sendEmailVerification.mock.calls.length;

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      expect(dbUser?.emailVerificationToken).toBeDefined();
      expect(dbUser?.emailVerificationToken).not.toBe(initialHash);
      expect(dbUser?.emailVerificationExpires).toBeInstanceOf(Date);
      expect(emailMock.sendEmailVerification.mock.calls.length).toBeGreaterThan(callsBefore);

      // Original registration token still valid for verification (rotation also verified via new hint): consume raw token from email mock
      const rawToken = emailMock.sendEmailVerification.mock.calls.at(-1)[1] as string;
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: rawToken })
        .expect(200);

      // Now login succeeds after verification
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      void registration;
    });
  });

  describe('POST /auth/refresh-token — rotation and DB observable state', () => {
    it('should rotate token pair and update refreshToken hash in DB', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
      const oldRefresh = login.body.refresh_token as string;
      const dbBefore = await prisma.user.findUnique({ where: { email: user.email } });
      const hashBefore = dbBefore?.refreshToken;

      const rotated = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: oldRefresh })
        .expect(200);

      expect(rotated.body.access_token).toBeDefined();
      expect(rotated.body.refresh_token).toBeDefined();
      expect(rotated.body.refresh_token).not.toBe(oldRefresh);

      const dbAfter = await prisma.user.findUnique({ where: { email: user.email } });
      expect(dbAfter?.refreshToken).toBeDefined();
      expect(dbAfter?.refreshToken).not.toBe(hashBefore);
    });

    it('should reject reuse of an already rotated refresh token and clear stored token in DB', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
      const refreshToken = login.body.refresh_token as string;

      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      // Reuse clears the stored token to contain theft
      expect(dbUser?.refreshToken).toBeNull();
    });

    it('should reject an invalid refresh token with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout — DB observable state', () => {
    it('should clear refreshToken in DB and blacklist access token, returning 200', async () => {
      const user = createTestUser();
      const registration = await registerUser(app, user);
      await verifyEmailViaApi(
        app,
        user.email,
        prisma,
        registration.body.email_verification_token as string,
      );
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
      const accessToken = login.body.access_token as string;

      const countBefore = await prisma.tokenBlacklist.count();

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logout realizado com sucesso');

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      expect(dbUser?.refreshToken).toBeNull();

      const countAfter = await prisma.tokenBlacklist.count();
      expect(countAfter).toBeGreaterThanOrEqual(countBefore + 1);
    });

    it('should reject logout without authentication with 401', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});

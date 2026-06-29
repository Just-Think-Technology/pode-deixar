import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  setupTestApp,
  createTestUser,
  createProviderUser,
  registerUser,
  verifyEmailViaApi,
  loginUser,
  registerAndLogin,
  bearerAuth,
  teardownTestApp,
  promoteToAdmin,
} from './test-setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('GET /auth/verify', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await teardownTestApp(app, prisma);
  });

  describe('Success cases', () => {
    it('should return authorized true and user data for a valid token', async () => {
      const user = createTestUser();
      const tokens = await registerAndLogin(app, user, prisma);

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(tokens.accessToken))
        .expect(200);

      expect(response.body).toEqual({
        authorized: true,
        user: {
          id: expect.any(String),
          email: user.email,
          role: user.role,
          complete_name: user.complete_name,
        },
        access_token: tokens.accessToken,
      });
    });

    it('should return authorized true for a PROVIDER user', async () => {
      const user = createProviderUser();
      const tokens = await registerAndLogin(app, user, prisma);

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(tokens.accessToken))
        .expect(200);

      expect(response.body.authorized).toBe(true);
      expect(response.body.user.role).toBe('PROVIDER');
    });

    it('should return authorized true for an ADMIN user', async () => {
      const user = createTestUser();
      const tokens = await registerAndLogin(app, user, prisma);
      await promoteToAdmin(prisma, user.email);

      const adminTokens = await loginUser(app, user.email, user.password);
      const adminAccessToken = adminTokens.body.access_token as string;

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(adminAccessToken))
        .expect(200);

      expect(response.body.authorized).toBe(true);
      expect(response.body.user.role).toBe('ADMIN');
    });
  });

  describe('Failure cases', () => {
    it('should return authorized false when user is deleted after token issuance', async () => {
      const user = createTestUser();
      const tokens = await registerAndLogin(app, user, prisma);

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      await prisma.clientProfile.delete({ where: { userId: dbUser!.id } });
      await prisma.user.delete({ where: { email: user.email } });

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(tokens.accessToken))
        .expect(200);

      expect(response.body).toEqual({
        authorized: false,
        access_token: tokens.accessToken,
      });
    });

    it('should return authorized false and not user data for an expired token', async () => {
      const expiredToken = jwtService.sign(
        {
          sub: '00000000-0000-0000-0000-000000000000',
          email: 'expired@example.com',
          role: 'CLIENT',
          type: 'access',
          iat: Math.floor(Date.now() / 1000) - 3600,
          exp: Math.floor(Date.now() / 1000) - 1800,
        },
        { secret: process.env.JWT_ACCESS_SECRET || 'ci-test-access-secret' },
      );

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(expiredToken))
        .expect(200);

      expect(response.body).toEqual({
        authorized: false,
        access_token: expiredToken,
      });
      expect(response.body).not.toHaveProperty('user');
    });

    it('should return authorized false for a token signed with a different secret', async () => {
      const fakeToken = jwtService.sign(
        {
          sub: '00000000-0000-0000-0000-0000-000000000000',
          email: 'fake@example.com',
          role: 'CLIENT',
          type: 'access',
        },
        { secret: 'wrong-secret' },
      );

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(fakeToken))
        .expect(200);

      expect(response.body).toEqual({
        authorized: false,
        access_token: fakeToken,
      });
    });

    it('should return authorized false for a malformed token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth('not-a-valid-jwt-token'))
        .expect(200);

      expect(response.body.authorized).toBe(false);
    });

    it('should return authorized false when no Authorization header is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .expect(200);

      expect(response.body).toEqual({
        authorized: false,
        access_token: null,
      });
    });

    it('should return authorized false when role in token does not match DB', async () => {
      const user = createTestUser();
      const tokens = await registerAndLogin(app, user, prisma);

      await prisma.user.update({
        where: { email: user.email },
        data: { role: 'PROVIDER' },
      });

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(tokens.accessToken))
        .expect(200);

      expect(response.body.authorized).toBe(false);
    });

    it('should return authorized false when email in token does not match DB', async () => {
      const user = createTestUser();
      const tokens = await registerAndLogin(app, user, prisma);

      await prisma.user.update({
        where: { email: user.email },
        data: { email: `changed_${user.email}` },
      });

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(tokens.accessToken))
        .expect(200);

      expect(response.body.authorized).toBe(false);
    });

    it('should return authorized false for a blacklisted token', async () => {
      const user = createTestUser();
      const tokens = await registerAndLogin(app, user, prisma);

      const payload = jwtService.decode(tokens.accessToken) as any;

      if (payload?.jti) {
        await prisma.tokenBlacklist.create({
          data: {
            jti: payload.jti,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set(bearerAuth(tokens.accessToken))
        .expect(200);

      expect(response.body.authorized).toBe(false);
    });
  });
});

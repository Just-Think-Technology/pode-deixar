import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  setupTestApp,
  createTestUser,
  createAdminUser,
  createProviderUser,
  registerAndLogin,
  promoteToAdmin,
  bearerAuth,
  teardownTestApp
} from './test-setup';
import { PrismaService } from '../src/prisma/prisma.service';

const EXPIRED_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Registers, verifies and logs in an ADMIN user.
 * Since ADMIN cannot be set via the public register endpoint, we register as
 * CLIENT first, promote via DB, then log in again to get a token with the
 * updated role.
 */
async function registerAndLoginAsAdmin(
  app: INestApplication,
  prisma: PrismaService,
): Promise<string> {
  const user = createAdminUser({ role: 'CLIENT' }); // register as CLIENT first
  await registerAndLogin(app, user, prisma);         // register + verify email
  await promoteToAdmin(prisma, user.email);          // promote in DB
  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  return loginResponse.body.access_token as string;
}

// ─── /auth/default-profile ────────────────────────────────────────────────────

describe('GET /auth/default-profile', () => {
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

  it('should return safe user profile for a valid token', async () => {
    const user = createTestUser();
    const { accessToken } = await registerAndLogin(app, user, prisma);
    const response = await request(app.getHttpServer())
      .get('/auth/default-profile')
      .set(bearerAuth(accessToken))
      .expect(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toMatchObject({
      email: user.email,
      complete_name: user.complete_name,
      role: user.role,
      email_verified: true,
    });
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should reject unauthenticated request with 401', async () => {
    const response = await request(app.getHttpServer()).get('/auth/default-profile').expect(401);
    expect(response.body).toHaveProperty('message');
  });

  it('should reject an invalid token with 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/default-profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    expect(response.body).toHaveProperty('message');
  });

  it('should reject an expired token with 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/default-profile')
      .set(bearerAuth(EXPIRED_JWT))
      .expect(401);
    expect(response.body).toHaveProperty('message');
  });
});

// ─── /auth/client-profile ─────────────────────────────────────────────────────

describe('GET /auth/client-profile', () => {
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

  it('should allow access for CLIENT role', async () => {
    const user = createTestUser({ role: 'CLIENT' });
    const { accessToken } = await registerAndLogin(app, user, prisma);
    const response = await request(app.getHttpServer())
      .get('/auth/client-profile')
      .set(bearerAuth(accessToken))
      .expect(200);
    expect(response.body).toHaveProperty('message');
  });

  it('should reject ADMIN role with 403', async () => {
    const accessToken = await registerAndLoginAsAdmin(app, prisma);
    await request(app.getHttpServer())
      .get('/auth/client-profile')
      .set(bearerAuth(accessToken))
      .expect(403);
  });

  it('should reject PROVIDER role with 403', async () => {
    const user = createProviderUser();
    const { accessToken } = await registerAndLogin(app, user, prisma);
    await request(app.getHttpServer())
      .get('/auth/client-profile')
      .set(bearerAuth(accessToken))
      .expect(403);
  });

  it('should reject unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/auth/client-profile').expect(401);
  });

  it('should reject an expired token with 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/client-profile')
      .set(bearerAuth(EXPIRED_JWT))
      .expect(401);
  });
});

// ─── /auth/admin-profile ──────────────────────────────────────────────────────

describe('GET /auth/admin-profile', () => {
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

  it('should allow access for ADMIN role', async () => {
    const accessToken = await registerAndLoginAsAdmin(app, prisma);
    const response = await request(app.getHttpServer())
      .get('/auth/admin-profile')
      .set(bearerAuth(accessToken))
      .expect(200);
    expect(response.body).toHaveProperty('message');
  });

  it('should reject CLIENT role with 403', async () => {
    const user = createTestUser({ role: 'CLIENT' });
    const { accessToken } = await registerAndLogin(app, user, prisma);
    await request(app.getHttpServer())
      .get('/auth/admin-profile')
      .set(bearerAuth(accessToken))
      .expect(403);
  });

  it('should reject PROVIDER role with 403', async () => {
    const user = createProviderUser();
    const { accessToken } = await registerAndLogin(app, user, prisma);
    await request(app.getHttpServer())
      .get('/auth/admin-profile')
      .set(bearerAuth(accessToken))
      .expect(403);
  });

  it('should reject unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/auth/admin-profile').expect(401);
  });

  it('should reject an expired token with 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/admin-profile')
      .set(bearerAuth(EXPIRED_JWT))
      .expect(401);
  });
});

// ─── /auth/provider-profile ───────────────────────────────────────────────────

describe('GET /auth/provider-profile', () => {
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

  it('should allow access for PROVIDER role', async () => {
    const user = createProviderUser();
    const { accessToken } = await registerAndLogin(app, user, prisma);
    const response = await request(app.getHttpServer())
      .get('/auth/provider-profile')
      .set(bearerAuth(accessToken))
      .expect(200);
    expect(response.body).toHaveProperty('message');
  });

  it('should reject CLIENT role with 403', async () => {
    const user = createTestUser({ role: 'CLIENT' });
    const { accessToken } = await registerAndLogin(app, user, prisma);
    await request(app.getHttpServer())
      .get('/auth/provider-profile')
      .set(bearerAuth(accessToken))
      .expect(403);
  });

  it('should reject ADMIN role with 403', async () => {
    const accessToken = await registerAndLoginAsAdmin(app, prisma);
    await request(app.getHttpServer())
      .get('/auth/provider-profile')
      .set(bearerAuth(accessToken))
      .expect(403);
  });

  it('should reject unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/auth/provider-profile').expect(401);
  });

  it('should reject an expired token with 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/provider-profile')
      .set(bearerAuth(EXPIRED_JWT))
      .expect(401);
  });
});
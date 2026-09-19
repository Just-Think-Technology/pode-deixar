// Profiles controller tests — HTTP status / guard / 403 via request(app)

import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  mintToken,
  bearerAuth,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';

describe('ProfilesController (HTTP)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup: TestAppSetup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  afterAll(async () => {
    await teardownTestApp(app, prisma);
  });

  describe('GET /profiles/me', () => {
    it('should return 401 without token (guard)', async () => {
      await request(app.getHttpServer()).get('/profiles/me').expect(401);
    });

    it('should return 200 for owner and contain profile data', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);
      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(bearerAuth(token))
        .send({})
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/profiles/me')
        .set(bearerAuth(token))
        .expect(200);

      expect(response.body.user.id).toBe(user.id);
    });

    it('should return 404 when no profile exists', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);

      await request(app.getHttpServer())
        .get('/profiles/me')
        .set(bearerAuth(token))
        .expect(404);
    });
  });

  describe('POST /profiles/client', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/profiles/client').send({}).expect(401);
    });

    it('should return 403 for PROVIDER (role guard)', async () => {
      const user = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(user);

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(bearerAuth(token))
        .send({})
        .expect(403);
    });

    it('should return 201 for CLIENT and persist preferences', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);

      const response = await request(app.getHttpServer())
        .post('/profiles/client')
        .set(bearerAuth(token))
        .send({ preferences: { theme: 'dark' } })
        .expect(201);

      expect(response.body.preferences).toEqual({ theme: 'dark' });

      const dbProfile = await prisma.clientProfile.findUnique({
        where: { userId: user.id },
      });
      expect(dbProfile?.preferences).toEqual({ theme: 'dark' });
    });
  });

  describe('POST /profiles/provider', () => {
    it('should return 403 for CLIENT', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);

      await request(app.getHttpServer())
        .post('/profiles/provider')
        .set(bearerAuth(token))
        .send({ bio: 'x' })
        .expect(403);
    });

    it('should return 201 for PROVIDER', async () => {
      const user = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(user);

      const response = await request(app.getHttpServer())
        .post('/profiles/provider')
        .set(bearerAuth(token))
        .send({ bio: 'Eletricista', hourlyRate: 80 })
        .expect(201);

      expect(response.body.bio).toBe('Eletricista');
      expect(response.body.hourly_rate).toBe(80);
    });
  });

  describe('GET /providers/:providerId/profile (public)', () => {
    it('should return 200 without authentication and not expose PII', async () => {
      const user = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(user);
      const profileId = (
        await request(app.getHttpServer())
          .post('/profiles/provider')
          .set(bearerAuth(token))
          .send({ bio: 'Encanador' })
          .expect(201)
      ).body.id;

      const response = await request(app.getHttpServer())
        .get(`/providers/${profileId}/profile`)
        .expect(200);

      expect(response.body.id).toBe(profileId);
      expect(response.body.user).not.toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('phone');
    });

    it('should return 404 for nonexistent provider', async () => {
      await request(app.getHttpServer())
        .get('/providers/00000000-0000-0000-0000-000000000000/profile')
        .expect(404);
    });
  });
});

import { INestApplication } from '@nestjs/common';
// import-require: these services lack esModuleInterop (unlike auth),
// so the default import compiles to a nonexistent `.default` at runtime.
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  mintToken,
  bearerAuth,
  mockMinio,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from "@pode-deixar/prisma";

// ─── Integration: Perfis (HTTP + banco real, MinIO mockado) ────────────────

describe('Profiles (integration)', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function clientAuth() {
    const user = await createTestUser(prisma, { role: 'CLIENT' });
    return { user, token: mintToken(user) };
  }

  async function providerAuth() {
    const user = await createTestUser(prisma, { role: 'PROVIDER' });
    return { user, token: mintToken(user) };
  }

  describe('POST /profiles/client', () => {
    it('deve criar perfil de cliente e retornar 201', async () => {
      const { token } = await clientAuth();

      const response = await request(app.getHttpServer())
        .post('/profiles/client')
        .set(bearerAuth(token))
        .send({ preferences: { theme: 'dark' } })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.preferences).toEqual({ theme: 'dark' });
      expect(response.body.user.complete_name).toBe('Test User');
    });

    it('should return 409 when creating a duplicate profile', async () => {
      const { token } = await clientAuth();
      const headers = bearerAuth(token);

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(headers)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(headers)
        .send({})
        .expect(409);
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .post('/profiles/client')
        .send({})
        .expect(401);
    });

    it('deve retornar 403 para PROVIDER', async () => {
      const { token } = await providerAuth();

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(bearerAuth(token))
        .send({})
        .expect(403);
    });
  });

  describe('GET /profiles/me', () => {
    it('should return the owner profile', async () => {
      const { token } = await clientAuth();

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(bearerAuth(token))
        .send({ preferences: { theme: 'light' } })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/profiles/me')
        .set(bearerAuth(token))
        .expect(200);

      expect(response.body.preferences).toEqual({ theme: 'light' });
    });

    it('deve retornar 404 quando não há perfil', async () => {
      const { token } = await clientAuth();

      await request(app.getHttpServer())
        .get('/profiles/me')
        .set(bearerAuth(token))
        .expect(404);
    });
  });

  describe('PATCH /profiles/client', () => {
    it('should update preferences', async () => {
      const { token } = await clientAuth();
      const headers = bearerAuth(token);

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(headers)
        .send({})
        .expect(201);

      const response = await request(app.getHttpServer())
        .patch('/profiles/client')
        .set(headers)
        .send({ preferences: { theme: 'dark', lang: 'pt-BR' } })
        .expect(200);

      expect(response.body.preferences).toEqual({
        theme: 'dark',
        lang: 'pt-BR',
      });
    });
  });

  describe('POST /profiles/provider', () => {
    it('deve criar perfil de prestador e retornar 201', async () => {
      const { token } = await providerAuth();

      const response = await request(app.getHttpServer())
        .post('/profiles/provider')
        .set(bearerAuth(token))
        .send({ bio: 'Eletricista', hourlyRate: 80, skills: ['eletrica'] })
        .expect(201);

      expect(response.body.bio).toBe('Eletricista');
      expect(response.body.hourly_rate).toBe(80);
      expect(response.body.skills).toEqual(['eletrica']);
    });

    it('deve retornar 403 para CLIENT', async () => {
      const { token } = await clientAuth();

      await request(app.getHttpServer())
        .post('/profiles/provider')
        .set(bearerAuth(token))
        .send({ bio: 'x' })
        .expect(403);
    });

    it('deve retornar 400 para hourlyRate inválido', async () => {
      const { token } = await providerAuth();

      await request(app.getHttpServer())
        .post('/profiles/provider')
        .set(bearerAuth(token))
        .send({ hourlyRate: 'caro' })
        .expect(400);
    });
  });

  describe('PATCH /profiles/avatar', () => {
    it('should upload an avatar and save the MinIO URL (mock)', async () => {
      const { token } = await clientAuth();
      const headers = bearerAuth(token);

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(headers)
        .send({})
        .expect(201);

      // The service validates magic bytes — the upload uses real PNG magic
      // bytes instead of fake content.
      const pngReal = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const response = await request(app.getHttpServer())
        .patch('/profiles/avatar')
        .set(headers)
        .attach('file', pngReal, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(mockMinio.uploadFile).toHaveBeenCalled();
      expect(response.body.avatar_url).toContain('http://minio.test/avatars/');
    });

    it('deve retornar 400 para tipo de arquivo inválido', async () => {
      const { token } = await clientAuth();
      const headers = bearerAuth(token);

      await request(app.getHttpServer())
        .post('/profiles/client')
        .set(headers)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .patch('/profiles/avatar')
        .set(headers)
        .attach('file', Buffer.from('not-an-image'), {
          filename: 'doc.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });

  describe('GET /providers/:providerId/profile (public)', () => {
    it('should return the public profile without authentication', async () => {
      const { token } = await providerAuth();
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
      expect(response.body.bio).toBe('Encanador');
      expect(response.body.services).toEqual([]);
    });

    it('deve retornar 404 para perfil inexistente', async () => {
      await request(app.getHttpServer())
        .get('/providers/00000000-0000-0000-0000-000000000000/profile')
        .expect(404);
    });
  });
});

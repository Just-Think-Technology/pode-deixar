// Provider services controller tests — HTTP status / guard / 403 via request(app)

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

describe('ProviderServicesController (HTTP)', () => {
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

  async function providerAuth() {
    const user = await createTestUser(prisma, { role: 'PROVIDER' });
    // Provider profile is required for service creation; create via API
    const token = mintToken(user);
    await request(app.getHttpServer())
      .post('/api/v1/profiles/provider')
      .set(bearerAuth(token))
      .send({ bio: 'Provider for services' })
      .expect(201);
    return { user, token };
  }

  async function createCategory() {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return prisma.category.create({ data: { name: `Cat ${suffix}`, slug: `cat-${suffix}` } });
  }

  describe('POST /providers/me/services', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/providers/me/services')
        .send({ title: 'X', description: 'Y', fixedPrice: 100, categoryId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('should return 403 for CLIENT role', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);
      const cat = await createCategory();
      await request(app.getHttpServer())
        .post('/api/v1/providers/me/services')
        .set(bearerAuth(token))
        .send({ title: 'Serviço', description: 'Desc', fixedPrice: 100, categoryId: cat.id })
        .expect(403);
    });

    it('should return 201 for PROVIDER and persist service', async () => {
      const { token } = await providerAuth();
      const cat = await createCategory();

      const response = await request(app.getHttpServer())
        .post('/api/v1/providers/me/services')
        .set(bearerAuth(token))
        .send({ title: 'Instalação', description: 'Descrição completa', fixedPrice: 150, categoryId: cat.id })
        .expect(201);

      expect(response.body.title).toBe('Instalação');
      expect(response.body.fixedPrice ?? response.body.fixed_price).toBeDefined();

      const db = await prisma.providerService.findUnique({ where: { id: response.body.id } });
      expect(db?.title).toBe('Instalação');
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await providerAuth();
      await request(app.getHttpServer())
        .post('/api/v1/providers/me/services')
        .set(bearerAuth(token))
        .send({ title: 'Only title' })
        .expect(400);
    });
  });

  describe('GET /providers/me/services', () => {
    it('should return 401 without token and 403 for CLIENT', async () => {
      await request(app.getHttpServer()).get('/api/v1/providers/me/services').expect(401);

      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(client);
      await request(app.getHttpServer())
        .get('/api/v1/providers/me/services')
        .set(bearerAuth(token))
        .expect(403);
    });

    it('should return 200 and list own services for PROVIDER', async () => {
      const { token } = await providerAuth();
      const cat = await createCategory();
      await request(app.getHttpServer())
        .post('/api/v1/providers/me/services')
        .set(bearerAuth(token))
        .send({ title: 'Serviço A', description: 'Desc', fixedPrice: 100, categoryId: cat.id })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/providers/me/services')
        .set(bearerAuth(token))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /providers/search', () => {
    it('should return 401 without token (requires CLIENT)', async () => {
      await request(app.getHttpServer()).get('/api/v1/providers/search').expect(401);
    });

    it('should return 200 for CLIENT with search', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(client);
      const response = await request(app.getHttpServer())
        .get('/api/v1/providers/search')
        .set(bearerAuth(token))
        .expect(200);
      expect(response.body).toBeDefined();
    });

    it('should return 403 for PROVIDER', async () => {
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(provider);
      await request(app.getHttpServer())
        .get('/api/v1/providers/search')
        .set(bearerAuth(token))
        .expect(403);
    });
  });
});

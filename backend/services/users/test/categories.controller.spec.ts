// Categories controller tests — HTTP status / guard / 403 via request(app)

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

describe('CategoriesController (HTTP)', () => {
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

  describe('GET /categories', () => {
    it('should return 200 without authentication (public)', async () => {
      const response = await request(app.getHttpServer()).get('/categories').expect(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return list with public select only (no internal fields)', async () => {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await prisma.category.create({ data: { name: `Cat ${suffix}`, slug: `cat-${suffix}` } });

      const response = await request(app.getHttpServer()).get('/categories').expect(200);
      const item = response.body.find((c: any) => c.slug === `cat-${suffix}`);
      expect(item).toBeDefined();
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('slug');
    });
  });

  describe('POST /categories (admin)', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Teste', slug: 'teste' })
        .expect(401);
    });

    it('should return 403 for non-admin role', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);

      await request(app.getHttpServer())
        .post('/categories')
        .set(bearerAuth(token))
        .send({ name: 'Teste', slug: 'teste-2' })
        .expect(403);
    });

    it('should return 201 for ADMIN and persist category', async () => {
      const admin = await createTestUser(prisma, { role: 'ADMIN' });
      const token = mintToken(admin);
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set(bearerAuth(token))
        .send({ name: `Admin Cat ${suffix}`, slug: `admin-cat-${suffix}` })
        .expect(201);

      expect(response.body.slug).toBe(`admin-cat-${suffix}`);

      const db = await prisma.category.findUnique({ where: { id: response.body.id } });
      expect(db?.name).toBe(`Admin Cat ${suffix}`);
    });

    it('should return 409 for duplicate name or slug', async () => {
      const admin = await createTestUser(prisma, { role: 'ADMIN' });
      const token = mintToken(admin);
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await request(app.getHttpServer())
        .post('/categories')
        .set(bearerAuth(token))
        .send({ name: `Dup ${suffix}`, slug: `dup-${suffix}` })
        .expect(201);

      await request(app.getHttpServer())
        .post('/categories')
        .set(bearerAuth(token))
        .send({ name: `Dup ${suffix}`, slug: `dup-${suffix}-other` })
        .expect(409);
    });
  });

  describe('PATCH /categories/:id (admin)', () => {
    it('should return 401 without token and 403 for CLIENT', async () => {
      await request(app.getHttpServer())
        .patch('/categories/00000000-0000-0000-0000-000000000000')
        .send({ name: 'X' })
        .expect(401);

      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(client);
      await request(app.getHttpServer())
        .patch('/categories/00000000-0000-0000-0000-000000000000')
        .set(bearerAuth(token))
        .send({ name: 'X' })
        .expect(403);
    });

    it('should return 404 for nonexistent category when admin', async () => {
      const admin = await createTestUser(prisma, { role: 'ADMIN' });
      const token = mintToken(admin);
      await request(app.getHttpServer())
        .patch('/categories/00000000-0000-0000-0000-000000000000')
        .set(bearerAuth(token))
        .send({ name: 'Atualizado' })
        .expect(404);
    });
  });
});

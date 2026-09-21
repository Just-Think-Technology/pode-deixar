// Provider finance controller tests — HTTP status / guard / 403 via request(app)

import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';

describe('ProviderFinanceController (HTTP)', () => {
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

  describe('GET /payments/provider/me/finance/summary', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/payments/provider/me/finance/summary').expect(401);
    });

    it('should return 403 for CLIENT role', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);
      await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/summary')
        .set(bearerAuth(token))
        .expect(403);
    });

    it('should return 200 with finance summary for PROVIDER', async () => {
      const user = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(user);
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/summary')
        .set(bearerAuth(token))
        .expect(200);

      expect(response.body).toHaveProperty('currency', 'BRL');
      expect(response.body).toHaveProperty('toReceiveNet');
      expect(response.body).toHaveProperty('pendingNet');
    });
  });

  describe('GET /payments/provider/me/finance/items', () => {
    it('should return 401 without token and 403 for CLIENT', async () => {
      await request(app.getHttpServer()).get('/api/v1/payments/provider/me/finance/items').expect(401);

      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(client);
      await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/items')
        .set(bearerAuth(token))
        .expect(403);
    });

    it('should return 200 with items array for PROVIDER and filter by status', async () => {
      const user = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(user);

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/items')
        .set(bearerAuth(token))
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);

      const filtered = await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/items?status=PAID')
        .set(bearerAuth(token))
        .expect(200);
      expect(Array.isArray(filtered.body)).toBe(true);
    });
  });

  describe('GET /payments/provider/me/finance/chart', () => {
    it('should return 401 without token and 403 for CLIENT', async () => {
      await request(app.getHttpServer()).get('/api/v1/payments/provider/me/finance/chart').expect(401);

      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(client);
      await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/chart')
        .set(bearerAuth(token))
        .expect(403);
    });

    it('should return 200 with chart data for PROVIDER (default 6 months)', async () => {
      const user = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(user);

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/chart')
        .set(bearerAuth(token))
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(6);

      const withMonths = await request(app.getHttpServer())
        .get('/api/v1/payments/provider/me/finance/chart?months=3')
        .set(bearerAuth(token))
        .expect(200);
      expect(withMonths.body.length).toBe(3);
    });
  });

  // Keep for backward compat with existing category helper unused variable
  void createCategory;
});

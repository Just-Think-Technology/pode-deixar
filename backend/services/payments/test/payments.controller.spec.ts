// Payments controller tests — HTTP status / guard / 403 via request(app)

import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  createCategory,
  createOrder,
  mintToken,
  bearerAuth,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';

describe('PaymentsController (HTTP)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup: TestAppSetup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    process.env.MOCK_WEBHOOK_KEY = 'test-webhook-key-controller';
  });

  afterAll(async () => {
    delete process.env.MOCK_WEBHOOK_KEY;
    await teardownTestApp(app, prisma);
  });

  const scheduledAt = '2030-01-01T10:00:00.000Z';

  async function clientWithOrder() {
    const user = await createTestUser(prisma, { role: 'CLIENT' });
    const cat = await createCategory(prisma);
    const order = await createOrder(prisma, user.id, cat.id, 150);
    return { user, token: mintToken(user), order };
  }

  describe('POST /payments', () => {
    it('should return 401 without token', async () => {
      const { order } = await clientWithOrder();
      await request(app.getHttpServer())
        .post('/payments')
        .send({ serviceOrderId: order.id, method: 'PIX', scheduledAt })
        .expect(401);
    });

    it('should return 403 when another client tries to create payment on чужое order', async () => {
      const owner = await clientWithOrder();
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(intruder);
      await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(token))
        .send({ serviceOrderId: owner.order.id, method: 'PIX', scheduledAt })
        .expect(403);
    });

    it('should return 201 for owner and persist payment with PENDING', async () => {
      const { token, order } = await clientWithOrder();
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(token))
        .send({ serviceOrderId: order.id, method: 'PIX', scheduledAt })
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      const db = await prisma.payment.findUnique({ where: { id: response.body.id } });
      expect(db?.serviceOrderId).toBe(order.id);
      expect(Number(db?.amount)).toBe(150);
    });

    it('should return 400 for missing required fields', async () => {
      const { token } = await clientWithOrder();
      await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(token))
        .send({})
        .expect(400);
    });

    it('should return 404 for nonexistent order', async () => {
      const { token } = await clientWithOrder();
      await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(token))
        .send({ serviceOrderId: '00000000-0000-0000-0000-000000000000', method: 'PIX', scheduledAt })
        .expect(404);
    });
  });

  describe('GET /payments/:paymentId/status', () => {
    it('should return 401 without token and 403 for чужое payment', async () => {
      const owner = await clientWithOrder();
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const paymentId = (
        await request(app.getHttpServer())
          .post('/payments')
          .set(bearerAuth(owner.token))
          .send({ serviceOrderId: owner.order.id, method: 'PIX', scheduledAt })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer()).get(`/payments/${paymentId}/status`).expect(401);

      await request(app.getHttpServer())
        .get(`/payments/${paymentId}/status`)
        .set(bearerAuth(mintToken(intruder)))
        .expect(403);
    });

    it('should return 200 with correct status for owner', async () => {
      const { token, order } = await clientWithOrder();
      const paymentId = (
        await request(app.getHttpServer())
          .post('/payments')
          .set(bearerAuth(token))
          .send({ serviceOrderId: order.id, method: 'PIX', scheduledAt })
          .expect(201)
      ).body.id as string;

      const response = await request(app.getHttpServer())
        .get(`/payments/${paymentId}/status`)
        .set(bearerAuth(token))
        .expect(200);

      expect(response.body.status).toBe('PENDING');
      expect(response.body.paymentId).toBe(paymentId);
    });

    it('should return 400 for invalid UUID', async () => {
      const { token } = await clientWithOrder();
      await request(app.getHttpServer())
        .get('/payments/not-a-uuid/status')
        .set(bearerAuth(token))
        .expect(400);
    });
  });

  describe('POST /payments/webhook (mock)', () => {
    it('should return 403 with invalid webhook key (guard)', async () => {
      const { token, order } = await clientWithOrder();
      const paymentId = (
        await request(app.getHttpServer())
          .post('/payments')
          .set(bearerAuth(token))
          .send({ serviceOrderId: order.id, method: 'PIX', scheduledAt })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('x-webhook-key', 'wrong-key')
        .send({
          paymentId,
          eventId: `evt_${Date.now()}`,
          externalId: 'tx_123',
          amount: 150,
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
        .expect(403);
    });

    it('should return 400 for missing timestamp (validation)', async () => {
      const { token, order } = await clientWithOrder();
      const paymentId = (
        await request(app.getHttpServer())
          .post('/payments')
          .set(bearerAuth(token))
          .send({ serviceOrderId: order.id, method: 'PIX', scheduledAt })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('x-webhook-key', 'test-webhook-key-controller')
        .send({ paymentId, eventId: 'evt_123', externalId: 'tx_123', amount: 150 })
        .expect(400);
    });
  });
});

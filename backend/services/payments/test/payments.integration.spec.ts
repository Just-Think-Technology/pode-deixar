import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
import { PrismaService } from '../src/prisma/prisma.service';

// ─── Integration: Pagamentos + webhook mock (HTTP + banco real) ────────────

describe('Payments (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previousWebhookKey: string | undefined;

  beforeAll(async () => {
    const setup: TestAppSetup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;

    previousWebhookKey = process.env.MOCK_WEBHOOK_KEY;
    process.env.MOCK_WEBHOOK_KEY = 'test-webhook-key';
  });

  afterAll(async () => {
    if (previousWebhookKey === undefined) {
      delete process.env.MOCK_WEBHOOK_KEY;
    } else {
      process.env.MOCK_WEBHOOK_KEY = previousWebhookKey;
    }
    await teardownTestApp(app, prisma);
  });

  const scheduledAt = '2030-01-01T10:00:00.000Z';

  async function clientWithOrder() {
    const user = await createTestUser(prisma, { role: 'CLIENT' });
    const cat = await createCategory(prisma);
    const order = await createOrder(prisma, user.id, cat.id, 150);
    return { user, token: mintToken(user), order };
  }

  async function createPayment(token: string, serviceOrderId: string) {
    return request(app.getHttpServer())
      .post('/payments')
      .set(bearerAuth(token))
      .send({ serviceOrderId, method: 'PIX', scheduledAt })
      .expect(201);
  }

  describe('POST /payments', () => {
    it('deve registrar pagamento PENDING para pedido do cliente', async () => {
      const { token, order } = await clientWithOrder();

      const response = await createPayment(token, order.id);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('PENDING');
    });

    it('deve retornar 400 sem campos obrigatórios', async () => {
      const { token } = await clientWithOrder();

      await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(token))
        .send({})
        .expect(400);
    });

    it('deve retornar 401 sem token e 403 para pedido alheio', async () => {
      const owner = await clientWithOrder();
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });

      await request(app.getHttpServer())
        .post('/payments')
        .send({
          serviceOrderId: owner.order.id,
          method: 'PIX',
          scheduledAt,
        })
        .expect(401);

      await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(mintToken(intruder)))
        .send({
          serviceOrderId: owner.order.id,
          method: 'PIX',
          scheduledAt,
        })
        .expect(403);
    });

    it('deve retornar 404 para pedido inexistente', async () => {
      const { token } = await clientWithOrder();

      await request(app.getHttpServer())
        .post('/payments')
        .set(bearerAuth(token))
        .send({
          serviceOrderId: '00000000-0000-0000-0000-000000000000',
          method: 'PIX',
          scheduledAt,
        })
        .expect(404);
    });
  });

  describe('GET /payments e GET /payments/:paymentId/status', () => {
    it('deve listar pagamentos do cliente', async () => {
      const { token, order } = await clientWithOrder();
      await createPayment(token, order.id);

      const response = await request(app.getHttpServer())
        .get('/payments')
        .set(bearerAuth(token))
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('PENDING');
    });

    it('deve consultar status e negar acesso a outro cliente', async () => {
      const owner = await clientWithOrder();
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const paymentId = (await createPayment(owner.token, owner.order.id))
        .body.id as string;

      const response = await request(app.getHttpServer())
        .get(`/payments/${paymentId}/status`)
        .set(bearerAuth(owner.token))
        .expect(200);
      expect(response.body.status).toBe('PENDING');

      await request(app.getHttpServer())
        .get(`/payments/${paymentId}/status`)
        .set(bearerAuth(mintToken(intruder)))
        .expect(403);
    });

    it('deve retornar 400 para UUID inválido', async () => {
      const { token } = await clientWithOrder();

      await request(app.getHttpServer())
        .get('/payments/not-a-uuid/status')
        .set(bearerAuth(token))
        .expect(400);
    });
  });

  describe('POST /payments/webhook (mock)', () => {
    function webhookDto(paymentId: string, eventId: string, amount = 150) {
      return {
        paymentId,
        eventId,
        externalId: `tx_mock_${eventId}`,
        amount,
      };
    }

    it('deve confirmar pagamento e marcar PAID', async () => {
      const { token, order } = await clientWithOrder();
      const paymentId = (await createPayment(token, order.id)).body.id as string;

      const response = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('x-webhook-key', 'test-webhook-key')
        .send(webhookDto(paymentId, `evt_${Date.now()}_a`))
        .expect(200);

      expect(response.body.payment.status).toBe('PAID');
    });

    it('deve ser idempotente para evento duplicado', async () => {
      const { token, order } = await clientWithOrder();
      const paymentId = (await createPayment(token, order.id)).body.id as string;
      const eventId = `evt_${Date.now()}_b`;
      const headers = { 'x-webhook-key': 'test-webhook-key' };

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set(headers)
        .send(webhookDto(paymentId, eventId))
        .expect(200);

      const duplicate = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set(headers)
        .send(webhookDto(paymentId, eventId))
        .expect(200);

      expect(duplicate.body.payment.status).toBe('PAID');
    });

    it('deve retornar 403 com chave inválida e 404 para pagamento inexistente', async () => {
      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('x-webhook-key', 'wrong-key')
        .send(
          webhookDto(
            '00000000-0000-0000-0000-000000000000',
            `evt_${Date.now()}_c`,
          ),
        )
        .expect(403);

      await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('x-webhook-key', 'test-webhook-key')
        .send(
          webhookDto(
            '00000000-0000-0000-0000-000000000000',
            `evt_${Date.now()}_d`,
          ),
        )
        .expect(404);
    });
  });
});

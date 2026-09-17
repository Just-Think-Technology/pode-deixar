// Tracking journey — JTT-105 consolidated view + start/finish/cancel

import request from 'supertest';
import {
  bootApps,
  shutdownApps,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  E2EApps,
} from './apps';

describe('Tracking journey (JTT-105)', () => {
  let apps: E2EApps;
  let clientToken: string;
  let providerToken: string;
  let strangerToken: string;
  let clientId: string;
  let providerId: string;
  let orderId: string;
  let orderId2: string;

  const previousWebhookKey = process.env.MOCK_WEBHOOK_KEY;

  beforeAll(async () => {
    apps = await bootApps();
    process.env.MOCK_WEBHOOK_KEY = 'test-webhook-key';

    const client = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const provider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const stranger = await createTestUser(apps.prisma, { role: 'CLIENT' });
    clientId = client.id;
    providerId = provider.id;
    clientToken = mintToken(client);
    providerToken = mintToken(provider);
    strangerToken = mintToken(stranger);
  }, 180000);

  afterAll(async () => {
    if (previousWebhookKey === undefined) {
      delete process.env.MOCK_WEBHOOK_KEY;
    } else {
      process.env.MOCK_WEBHOOK_KEY = previousWebhookKey;
    }
    await shutdownApps(apps);
  });

  it('1. client creates order, provider proposes, client accepts → IN_PROGRESS', async () => {
    const category = await createCategory(apps.prisma);

    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Troca da torneira',
          description: 'Troca da torneira da cozinha',
          categoryId: category.id,
        })
        .expect(201)
    ).body;
    orderId = order.id as string;

    const proposalId = (
      await request(apps.ordersApp.getHttpServer())
        .post('/proposals')
        .set(bearerAuth(providerToken))
        .send({ serviceOrderId: orderId, price: 180, description: 'Faço hoje' })
        .expect(201)
    ).body.id as string;

    await request(apps.ordersApp.getHttpServer())
      .post(`/proposals/${proposalId}/accept`)
      .set(bearerAuth(clientToken))
      .expect(201);

    // Create payment so tracking can show PAID later
    const payment = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/payments')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          method: 'PIX',
          scheduledAt: '2030-03-10T14:00:00.000Z',
          scheduledEndAt: '2030-03-10T16:00:00.000Z',
        })
        .expect(201)
    ).body;

    await request(apps.paymentsApp.getHttpServer())
      .post('/payments/webhook')
      .set('x-webhook-key', 'test-webhook-key')
      .send({
        paymentId: payment.id,
        eventId: `evt_tracking_${Date.now()}`,
        externalId: 'tx_mock_tracking_1',
        amount: 180,
        timestamp: String(Math.floor(Date.now() / 1000)),
      })
      .expect(201);
  });

  it('2. GET /services/:orderId/tracking returns 403 for stranger', async () => {
    await request(apps.ordersApp.getHttpServer())
      .get(`/services/${orderId}/tracking`)
      .set(bearerAuth(strangerToken))
      .expect(403);
  });

  it('3. tracking returns consolidated view, fee redacted for CLIENT', async () => {
    const asProvider = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/${orderId}/tracking`)
        .set(bearerAuth(providerToken))
        .expect(200)
    ).body;

    expect(asProvider.orderId).toBe(orderId);
    expect(asProvider.grossAmount).toBe(180);
    expect(asProvider.feeAmount).toBe(18);
    expect(asProvider.netAmount).toBe(162);
    expect(asProvider.payment.status).toBe('PAID');
    expect(asProvider.counterpart.completeName).toBeDefined();

    const asClient = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/${orderId}/tracking`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;

    expect(asClient.feeAmount).toBeUndefined();
    expect(asClient.netAmount).toBeUndefined();
    expect(asClient.grossAmount).toBe(180);
  });

  it('4. provider start transitions SCHEDULED → IN_PROGRESS', async () => {
    const started = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/start`)
        .set(bearerAuth(providerToken))
        .expect(201)
    ).body;

    expect(started.startedAt).toBeDefined();

    // Idempotent second call
    const started2 = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/start`)
        .set(bearerAuth(providerToken))
        .expect(201)
    ).body;
    expect(started2.startedAt).toBeDefined();
  });

  it('5. provider finish with multipart evidence → COMPLETED', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const finished = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/finish`)
        .set(bearerAuth(providerToken))
        .field('observations', 'Concluído com sucesso')
        .attach('photos', png1x1, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201)
    ).body;

    expect(finished.orderStatus).toBe('COMPLETED');
    expect(finished.evidence).toBeDefined();
    expect(finished.evidence.photos.length).toBeGreaterThan(0);
    expect(finished.evidence.observations).toBe('Concluído com sucesso');
  });

  it('6. cancel from non-final status with reason', async () => {
    const category = await createCategory(apps.prisma);
    const order2 = (
      await request(apps.ordersApp.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Desentupimento',
          description: 'Pia entupida',
          categoryId: category.id,
        })
        .expect(201)
    ).body;
    orderId2 = order2.id as string;

    const cancelled = (
      await request(apps.ordersApp.getHttpServer())
        .delete(`/services/me/${orderId2}`)
        .set(bearerAuth(clientToken))
        .send({ cancelReason: 'Mudança de planos' })
        .expect(200)
    ).body;

    expect(cancelled.status).toBe('CANCELLED');

    const tracking = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/${orderId2}/tracking`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;

    expect(tracking.orderStatus).toBe('CANCELLED');
    expect(tracking.cancelReason).toBe('Mudança de planos');
    expect(tracking.cancelledAt).toBeDefined();
  });
});

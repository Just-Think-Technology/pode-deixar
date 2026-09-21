// Provider journey tests — cross-service provider flows

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

// --- Provider Journey ---

// Profile (users) → service → order (orders) → proposal → acceptance → completion
// → payment + webhook (payments) → review (reviews) → rating reflected
// on the profile (users). All in the same database, as in production.

describe('Provider journey (cross-service e2e)', () => {
  let apps: E2EApps;
  let clientToken: string;
  let providerToken: string;
  let clientId: string;
  let providerId: string;
  let providerProfileId: string;
  let categoryId: string;
  let orderId: string;
  let proposalId: string;
  let paymentId: string;

  const previousWebhookKey = process.env.MOCK_WEBHOOK_KEY;

  beforeAll(async () => {
    apps = await bootApps();
    process.env.MOCK_WEBHOOK_KEY = 'test-webhook-key';

    const client = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const provider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    clientId = client.id;
    providerId = provider.id;
    clientToken = mintToken(client);
    providerToken = mintToken(provider);

    const category = await createCategory(apps.prisma);
    categoryId = category.id;
  }, 180000);

  afterAll(async () => {
    if (previousWebhookKey === undefined) {
      delete process.env.MOCK_WEBHOOK_KEY;
    } else {
      process.env.MOCK_WEBHOOK_KEY = previousWebhookKey;
    }
    await shutdownApps(apps);
  });

  it('1. provider creates profile and registers a service (users)', async () => {
    const clientHeaders = bearerAuth(clientToken);
    const providerHeaders = bearerAuth(providerToken);

    // The client also needs a profile to exist in the ecosystem
    await request(apps.usersApp.getHttpServer())
      .post('/api/v1/profiles/client')
      .set(clientHeaders)
      .send({})
      .expect(201);

    const profile = (
      await request(apps.usersApp.getHttpServer())
        .post('/api/v1/profiles/provider')
        .set(providerHeaders)
        .send({ bio: 'Eletricista experiente', hourlyRate: 80 })
        .expect(201)
    ).body;
    providerProfileId = profile.id as string;
    expect(providerProfileId).toBeDefined();

    const service = (
      await request(apps.usersApp.getHttpServer())
        .post('/api/v1/providers/me/services')
        .set(providerHeaders)
        .send({
          title: 'Instalação de chuveiro',
          description: 'Instalação completa com garantia',
          fixedPrice: 150,
          categoryId,
        })
        .expect(201)
    ).body;
    expect(service.fixed_price).toBe(150);
  });

  it('2. client creates an order (orders)', async () => {
    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/api/v1/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Chuveiro queimado',
          description: 'Preciso trocar o chuveiro ainda hoje',
          categoryId,
        })
        .expect(201)
    ).body;

    orderId = order.id as string;
    expect(order.status).toBe('OPEN');
    expect(order.client_id).toBe(clientId);
  });

  it('3. provider sends a proposal (orders)', async () => {
    const proposal = (
      await request(apps.ordersApp.getHttpServer())
        .post('/api/v1/proposals')
        .set(bearerAuth(providerToken))
        .send({
          serviceOrderId: orderId,
          price: 180,
          description: 'Faço hoje à tarde',
        })
        .expect(201)
    ).body;

    proposalId = proposal.id as string;
    expect(proposal.status).toBe('PENDING');
  });

  it('4. client accepts the proposal (orders)', async () => {
    const accepted = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/accept`)
        .set(bearerAuth(clientToken))
        .expect(201)
    ).body;

    expect(accepted.status).toBe('ACCEPTED');

    const order = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/api/v1/services/me/${orderId}`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(order.status).toBe('IN_PROGRESS');
  });

  it('5. provider completes the service (orders)', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await request(apps.ordersApp.getHttpServer())
      .post(`/api/v1/services/me/${orderId}/completion-photos`)
      .set(bearerAuth(providerToken))
      .attach('file', png1x1, {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .expect(201);

    const completed = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/api/v1/services/me/${orderId}/complete`)
        .set(bearerAuth(providerToken))
        .send({ observations: 'Serviço concluído' })
        .expect(201)
    ).body;

    expect(completed.order_id).toBe(orderId);
    expect(completed.completed_at).toBeDefined();
  });

  it('6. client generates payment and confirms via webhook (payments)', async () => {
    const payment = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/api/v1/payments')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          method: 'PIX',
          scheduledAt: '2030-01-01T10:00:00.000Z',
        })
        .expect(201)
    ).body;
    paymentId = payment.id as string;
    expect(payment.status).toBe('PENDING');

    const confirmed = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('x-webhook-key', 'test-webhook-key')
        .send({
          paymentId,
          eventId: `evt_e2e_${Date.now()}`,
          externalId: 'tx_mock_e2e_1',
          amount: 180,
          // Anti-replay timestamp is now required.
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
        .expect(201)
    ).body;
    expect(confirmed.payment.status).toBe('PAID');
  });

  it('7. client reviews and the rating reflects on the profile (reviews → users)', async () => {
    const review = (
      await request(apps.reviewsApp.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          rating: 5,
          comment: 'Serviço impecável',
        })
        .expect(201)
    ).body;

    expect(review.reviewer_id).toBe(clientId);
    expect(review.reviewee_id).toBe(providerId);

    // Cross-service assertion: the reviews-service recalculated the rating
    // on the SAME table the users-service reads.
    const profile = (
      await request(apps.usersApp.getHttpServer())
        .get(`/api/v1/providers/${providerProfileId}/profile`)
        .expect(200)
    ).body;

    expect(profile.rating).toBe(5);
    expect(profile.total_reviews).toBe(1);
    expect(profile.services).toHaveLength(1);
  });
});

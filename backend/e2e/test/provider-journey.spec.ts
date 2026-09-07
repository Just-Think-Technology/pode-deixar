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

// ─── E2E: jornada completa do prestador ─────────────────────────────────────
// Perfil (users) → serviço → pedido (orders) → proposta → aceite → conclusão
// → pagamento + webhook (payments) → avaliação (reviews) → rating refletido
// no perfil (users). Tudo no mesmo banco, como em produção.

describe('Jornada do prestador (e2e cross-service)', () => {
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

  it('1. prestador cria perfil e cadastra serviço (users)', async () => {
    const clientHeaders = bearerAuth(clientToken);
    const providerHeaders = bearerAuth(providerToken);

    // Cliente também precisa de perfil para existir no ecossistema
    await request(apps.usersApp.getHttpServer())
      .post('/profiles/client')
      .set(clientHeaders)
      .send({})
      .expect(201);

    const profile = (
      await request(apps.usersApp.getHttpServer())
        .post('/profiles/provider')
        .set(providerHeaders)
        .send({ bio: 'Eletricista experiente', hourlyRate: 80 })
        .expect(201)
    ).body;
    providerProfileId = profile.id as string;
    expect(providerProfileId).toBeDefined();

    const service = (
      await request(apps.usersApp.getHttpServer())
        .post('/providers/me/services')
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

  it('2. cliente cria pedido (orders)', async () => {
    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/services/me')
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

  it('3. prestador envia proposta (orders)', async () => {
    const proposal = (
      await request(apps.ordersApp.getHttpServer())
        .post('/proposals')
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

  it('4. cliente aceita a proposta (orders)', async () => {
    const accepted = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/proposals/${proposalId}/accept`)
        .set(bearerAuth(clientToken))
        .expect(201)
    ).body;

    expect(accepted.status).toBe('ACCEPTED');

    const order = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/me/${orderId}`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(order.status).toBe('IN_PROGRESS');
  });

  it('5. prestador conclui o serviço (orders)', async () => {
    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/complete`)
        .set(bearerAuth(providerToken))
        .expect(201)
    ).body;

    expect(order.status).toBe('COMPLETED');
  });

  it('6. cliente gera pagamento e confirma via webhook (payments)', async () => {
    const payment = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/payments')
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
        .post('/payments/webhook')
        .set('x-webhook-key', 'test-webhook-key')
        .send({
          paymentId,
          eventId: `evt_e2e_${Date.now()}`,
          externalId: 'tx_mock_e2e_1',
          amount: 180,
          // Justificativa AppSec: timestamp anti-replay agora é obrigatório.
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
        .expect(201)
    ).body;
    expect(confirmed.payment.status).toBe('PAID');
  });

  it('7. cliente avalia e o rating reflete no perfil (reviews → users)', async () => {
    const review = (
      await request(apps.reviewsApp.getHttpServer())
        .post('/reviews')
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

    // Assertiva cross-service: o reviews-service recalculou o rating
    // na MESMA tabela que o users-service lê.
    const profile = (
      await request(apps.usersApp.getHttpServer())
        .get(`/providers/${providerProfileId}/profile`)
        .expect(200)
    ).body;

    expect(profile.rating).toBe(5);
    expect(profile.total_reviews).toBe(1);
    expect(profile.services).toHaveLength(1);
  });
});

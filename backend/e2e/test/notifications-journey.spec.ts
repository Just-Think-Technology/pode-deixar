// Notifications journey — Task 8 integration (proposals, payments, service start/finish, reviews)

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

describe('Notifications journey (Task 8)', () => {
  let apps: E2EApps;
  let clientToken: string;
  let providerToken: string;
  let clientId: string;
  let providerId: string;
  let orderId: string;
  let proposalId: string;
  let paymentId: string;
  let categoryId: string;

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

  async function getNotifications(token: string, query = '') {
    const res = await request(apps.usersApp.getHttpServer())
      .get(`/api/v1/notifications${query}`)
      .set(bearerAuth(token))
      .expect(200);
    return res.body as Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      message: string;
      contractId: string | null;
      isRead: boolean;
    }>;
  }

  it('1. nova proposta → cliente receives SERVICE notification', async () => {
    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/api/v1/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Instalação de ar condicionado',
          description: 'Instalar ar 12000 BTUs',
          categoryId,
        })
        .expect(201)
    ).body;
    orderId = order.id as string;

    const proposal = (
      await request(apps.ordersApp.getHttpServer())
        .post('/api/v1/proposals')
        .set(bearerAuth(providerToken))
        .send({
          serviceOrderId: orderId,
          price: 250,
          description: 'Faço amanhã',
        })
        .expect(201)
    ).body;
    proposalId = proposal.id as string;

    const clientNotifs = await getNotifications(clientToken);
    const novaProposta = clientNotifs.find(
      (n) => n.type === 'SERVICE' && n.contractId === orderId && n.title === 'Nova proposta',
    );
    expect(novaProposta).toBeDefined();
    expect(novaProposta!.message).toContain('Instalação de ar condicionado');

    // Anti-duplicate: provider must NOT see client's nova proposta (isolation)
    const providerNotifs = await getNotifications(providerToken);
    const leaked = providerNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Nova proposta',
    );
    expect(leaked).toBeUndefined();
  });

  it('2. proposta aceita → provider receives SERVICE notification with anti-duplicate', async () => {
    await request(apps.ordersApp.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set(bearerAuth(clientToken))
      .expect(201);

    const providerNotifs = await getNotifications(providerToken);
    const accepted = providerNotifs.find(
      (n) => n.type === 'SERVICE' && n.contractId === orderId && n.title === 'Proposta aceita',
    );
    expect(accepted).toBeDefined();
    expect(accepted!.message).toContain('Instalação de ar condicionado');

    // Anti-duplicate: second fetch still only one accepted notification (window 60s + idempotent accept fails)
    const providerNotifs2 = await getNotifications(providerToken);
    const acceptedCount = providerNotifs2.filter(
      (n) => n.contractId === orderId && n.title === 'Proposta aceita',
    ).length;
    expect(acceptedCount).toBe(1);
  });

  it('3. pagamento confirmado → ambos (client + provider) receive SERVICE notification and duplicate webhook is deduped', async () => {
    const payment = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/api/v1/payments')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          method: 'PIX',
          scheduledAt: '2030-04-01T10:00:00.000Z',
          scheduledEndAt: '2030-04-01T12:00:00.000Z',
        })
        .expect(201)
    ).body;
    paymentId = payment.id as string;

    const eventId = `evt_notif_journey_${Date.now()}`;
    await request(apps.paymentsApp.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-webhook-key', 'test-webhook-key')
      .send({
        paymentId,
        eventId,
        externalId: 'tx_mock_notif_journey_1',
        amount: 250,
        timestamp: String(Math.floor(Date.now() / 1000)),
      })
      .expect(201);

    const clientNotifs = await getNotifications(clientToken);
    const providerNotifs = await getNotifications(providerToken);

    const clientPaid = clientNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Pagamento confirmado',
    );
    const providerPaid = providerNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Pagamento confirmado',
    );
    expect(clientPaid).toBeDefined();
    expect(providerPaid).toBeDefined();
    expect(clientPaid!.type).toBe('SERVICE');
    expect(providerPaid!.type).toBe('SERVICE');

    // Duplicate webhook with same eventId must not create second notification (existsRecent + idempotent)
    await request(apps.paymentsApp.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-webhook-key', 'test-webhook-key')
      .send({
        paymentId,
        eventId,
        externalId: 'tx_mock_notif_journey_1',
        amount: 250,
        timestamp: String(Math.floor(Date.now() / 1000)),
      })
      .expect(201);

    const clientNotifsAfter = await getNotifications(clientToken);
    const paidCount = clientNotifsAfter.filter(
      (n) => n.contractId === orderId && n.title === 'Pagamento confirmado',
    ).length;
    expect(paidCount).toBe(1);
  });

  it('4. serviço iniciado → cliente receives SERVICE notification', async () => {
    const started = await request(apps.ordersApp.getHttpServer())
      .post(`/api/v1/services/me/${orderId}/start`)
      .set(bearerAuth(providerToken))
      .expect(201);
    expect(started.body.startedAt).toBeDefined();

    const clientNotifs = await getNotifications(clientToken);
    const startedNotif = clientNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Serviço iniciado',
    );
    expect(startedNotif).toBeDefined();
    expect(startedNotif!.type).toBe('SERVICE');

    // Idempotent second start must not duplicate due to existsRecent
    await request(apps.ordersApp.getHttpServer())
      .post(`/api/v1/services/me/${orderId}/start`)
      .set(bearerAuth(providerToken))
      .expect(201);
    const clientNotifs2 = await getNotifications(clientToken);
    const startedCount = clientNotifs2.filter(
      (n) => n.contractId === orderId && n.title === 'Serviço iniciado',
    ).length;
    expect(startedCount).toBe(1);
  });

  it('5. serviço finalizado → cliente receives SERVICE notification', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const finished = await request(apps.ordersApp.getHttpServer())
      .post(`/api/v1/services/me/${orderId}/finish`)
      .set(bearerAuth(providerToken))
      .field('observations', 'Concluído com sucesso')
      .attach('photos', png1x1, { filename: 'foto.png', contentType: 'image/png' })
      .expect(201);
    expect(finished.body.orderStatus).toBe('COMPLETED');

    const clientNotifs = await getNotifications(clientToken);
    const finishedNotif = clientNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Serviço concluído',
    );
    expect(finishedNotif).toBeDefined();
    expect(finishedNotif!.type).toBe('SERVICE');
  });

  it('6. avaliação → provider receives SERVICE notification and is isolated per user', async () => {
    const review = (
      await request(apps.reviewsApp.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          rating: 5,
          comment: 'Excelente trabalho',
        })
        .expect(201)
    ).body;
    expect(review.rating).toBe(5);

    const providerNotifs = await getNotifications(providerToken);
    const reviewNotif = providerNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Nova avaliação',
    );
    expect(reviewNotif).toBeDefined();
    expect(reviewNotif!.type).toBe('SERVICE');

    // Client must not see provider's review notification (isolation)
    const clientNotifs = await getNotifications(clientToken);
    const clientReviewLeak = clientNotifs.find(
      (n) => n.contractId === orderId && n.title === 'Nova avaliação',
    );
    expect(clientReviewLeak).toBeUndefined();

    // Conversas tab remains isolated — service notifications must not appear in CONVERSATION filter
    const convNotifs = await getNotifications(providerToken, '?type=CONVERSATION');
    const convLeak = convNotifs.find((n) => n.contractId === orderId);
    expect(convLeak).toBeUndefined();
  });
});

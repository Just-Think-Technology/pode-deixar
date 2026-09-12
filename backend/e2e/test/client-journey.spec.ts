import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  bootApps,
  bootAuthApp,
  shutdownApps,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  mockEmail,
  E2EApps,
} from './apps';

// --- Client Journey ---
// Complete client cross-service journey: signup (auth) → verification → login
// → profile (users) → order → proposal → acceptance → completion (orders)
// → payment + webhook (payments) → review (reviews). Auth service token is
// accepted by the other 4 services for real (same secret), as in production.

describe('Client journey (cross-service e2e)', () => {
  let apps: E2EApps;
  let authApp: INestApplication;
  let accessToken: string;
  let clientId: string;
  let orderId: string;
  let paymentId: string;

  const previousWebhookKey = process.env.MOCK_WEBHOOK_KEY;

  beforeAll(async () => {
    // Deterministic, MANDATORY order: auth first (see the passport-singleton
    // comment in apps.ts). If auth boots last, its strategy (req.user without
    // `sub`) hijacks the guards of the other 4 services in the same process.
    authApp = await bootAuthApp();
    apps = await bootApps();
    process.env.MOCK_WEBHOOK_KEY = 'test-webhook-key';
  }, 240000);

  afterAll(async () => {
    if (previousWebhookKey === undefined) {
      delete process.env.MOCK_WEBHOOK_KEY;
    } else {
      process.env.MOCK_WEBHOOK_KEY = previousWebhookKey;
    }
    await authApp.close();
    await shutdownApps(apps);
  });

  it('1. client signs up, verifies email and logs in (auth)', async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const dto = {
      complete_name: 'Cliente Jornada',
      email: `cliente_${suffix}@example.com`,
      password: 'TestPassword123!',
      confirm_password: 'TestPassword123!',
      phone: '+1234567890',
      postal_code: '12345-678',
      role: 'CLIENT',
    };

    const registered = (
      await request(authApp.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201)
    ).body;
    clientId = registered.user.id as string;
    expect(clientId).toBeDefined();
    expect(registered.user.email_verified).toBe(false);
    expect(mockEmail.sendEmailVerification).toHaveBeenCalled();

    // Duplicate email gets the same generic response (anti-enumeration)
    const duplicate = (
      await request(authApp.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201)
    ).body;
    expect(duplicate.message).toBe(registered.message);
    expect(duplicate.user).toBeUndefined();

    // Re-registering an unverified email rotates the token (hash in the
    // database): the current raw token is the one from the last sent email (mock).
    const rawToken = (
      mockEmail.sendEmailVerification.mock.calls.at(-1) as unknown[]
    )[1] as string;
    expect(rawToken).toBeDefined();

    await request(authApp.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(200);

    const logged = (
      await request(authApp.getHttpServer())
        .post('/auth/login')
        .send({ email: dto.email, password: dto.password })
        .expect(200)
    ).body;
    accessToken = logged.access_token as string;
    expect(accessToken).toBeDefined();
  });

  it('2. auto-created signup profile is readable/editable (users)', async () => {
    // The auth register already created the clientProfile in the same database —
    // integration proof via shared data, driven with the auth token.
    const profile = (
      await request(apps.usersApp.getHttpServer())
        .get('/profiles/me')
        .set(bearerAuth(accessToken))
        .expect(200)
    ).body;

    expect(profile.user.id).toBe(clientId);
    expect(profile.preferences).toEqual({});

    const updated = (
      await request(apps.usersApp.getHttpServer())
        .patch('/profiles/client')
        .set(bearerAuth(accessToken))
        .send({ preferences: { theme: 'dark' } })
        .expect(200)
    ).body;
    expect(updated.preferences).toEqual({ theme: 'dark' });
  });

  it('3. cliente cria pedido (orders)', async () => {
    const category = await createCategory(apps.prisma);

    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(accessToken))
        .send({
          title: 'Pintura da sala',
          description: 'Pintar paredes da sala com tinta acrílica',
          categoryId: category.id,
        })
        .expect(201)
    ).body;

    orderId = order.id as string;
    expect(order.status).toBe('OPEN');
  });

  it('4. provider proposes and client accepts (orders)', async () => {
    const provider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const providerToken = mintToken(provider);

    const proposalId = (
      await request(apps.ordersApp.getHttpServer())
        .post('/proposals')
        .set(bearerAuth(providerToken))
        .send({
          serviceOrderId: orderId,
          price: 300,
          description: 'Faço no fim de semana',
        })
        .expect(201)
    ).body.id as string;

    const accepted = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/proposals/${proposalId}/accept`)
        .set(bearerAuth(accessToken))
        .expect(201)
    ).body;
    expect(accepted.status).toBe('ACCEPTED');

    // Provider completes to unlock payment and review
    const completed = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/complete`)
        .set(bearerAuth(providerToken))
        .expect(201)
    ).body;
    expect(completed.status).toBe('COMPLETED');
  });

  it '5. client pays via PIX and confirms (payments)', async () => {
    const payment = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/payments')
        .set(bearerAuth(accessToken))
        .send({
          serviceOrderId: orderId,
          method: 'PIX',
          scheduledAt: '2030-02-01T10:00:00.000Z',
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
          eventId: `evt_e2e_client_${Date.now()}`,
          externalId: 'tx_mock_e2e_client_1',
          amount: 300,
          // Anti-replay timestamp is now required.
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
        .expect(201)
    ).body;
    expect(confirmed.payment.status).toBe('PAID');
  };

  it '6. client reviews the service (reviews)', async () => {
    const review = (
      await request(apps.reviewsApp.getHttpServer())
        .post('/reviews')
        .set(bearerAuth(accessToken))
        .send({
          serviceOrderId: orderId,
          rating: 5,
          comment: 'Ótimo serviço do início ao fim',
        })
        .expect(201)
    ).body;

    expect(review.reviewer_id).toBe(clientId);
    expect(review.rating).toBe(5);

    const mine = (
      await request(apps.reviewsApp.getHttpServer())
        .get('/reviews/me')
        .set(bearerAuth(accessToken))
        .expect(200)
    ).body;
    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe(review.id);
  });
});
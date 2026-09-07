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

// ─── E2E: jornada completa do cliente ───────────────────────────────────────
// Cadastro (auth) → verificação → login → perfil (users) → pedido → proposta
// → aceite → conclusão (orders) → pagamento + webhook (payments) → avaliação
// (reviews). O token emitido pelo auth-service é aceito pelos outros 4
// serviços de verdade (mesmo segredo), como em produção.

describe('Jornada do cliente (e2e cross-service)', () => {
  let apps: E2EApps;
  let authApp: INestApplication;
  let accessToken: string;
  let clientId: string;
  let orderId: string;
  let paymentId: string;

  const previousWebhookKey = process.env.MOCK_WEBHOOK_KEY;

  beforeAll(async () => {
    // Ordem determinística e OBRIGATÓRIA: auth primeiro (ver comentário
    // sobre o singleton do passport em apps.ts). Se o auth bootar por
    // último, a strategy dele (req.user sem `sub`) hijacka os guards
    // dos outros 4 serviços no mesmo processo.
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

  it('1. cliente se cadastra, verifica o email e faz login (auth)', async () => {
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

    // Email duplicado deve ser rejeitado
    await request(authApp.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(409);

    const token = registered.email_verification_token as string;
    expect(token).toBeDefined();

    await request(authApp.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
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

  it('2. perfil auto-criado no cadastro é legível/editável (users)', async () => {
    // O register (auth) já criou o clientProfile no mesmo banco — prova
    // de integração via dados compartilhados, lida com o token do auth.
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

  it('4. prestador propõe e cliente aceita (orders)', async () => {
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

    // Prestador conclui para liberar pagamento e avaliação
    const completed = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/complete`)
        .set(bearerAuth(providerToken))
        .expect(201)
    ).body;
    expect(completed.status).toBe('COMPLETED');
  });

  it('5. cliente paga via PIX e confirma (payments)', async () => {
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
          // Justificativa AppSec: timestamp anti-replay agora é obrigatório.
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
        .expect(201)
    ).body;
    expect(confirmed.payment.status).toBe('PAID');
  });

  it('6. cliente avalia o serviço (reviews)', async () => {
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

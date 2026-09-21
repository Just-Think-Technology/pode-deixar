// Tracking tests — cross-endpoint integration flows

import { INestApplication } from '@nestjs/common';
// import-require: these services lack esModuleInterop (unlike auth),
// so the default import compiles to a nonexistent `.default` at runtime.
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  mockMinio,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';

// Valid 1x1 PNG (the upload converts to webp via sharp).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// --- Integration: Tracking ---

describe('Tracking (integration)', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function clientAuth() {
    const user = await createTestUser(prisma, { role: 'CLIENT' });
    return { user, token: mintToken(user) };
  }

  async function providerAuth() {
    const user = await createTestUser(prisma, { role: 'PROVIDER' });
    return { user, token: mintToken(user) };
  }

  async function createOrderAsClient(token: string, categoryId: string) {
    return request(app.getHttpServer())
      .post('/api/v1/services/me')
      .set(bearerAuth(token))
      .send({
        title: 'Serviço tracking',
        description: 'Descrição completa para tracking',
        categoryId,
      })
      .expect(201);
  }

  async function hireOrder(
    clientUserId: string,
    providerUserId: string,
    categoryId: string,
  ) {
    // Create an IN_PROGRESS hired order directly via prisma to avoid provider-services ceremony
    const providerProfile = await prisma.providerProfile.upsert({
      where: { userId: providerUserId },
      update: {},
      create: { userId: providerUserId, bio: 'Prestador' },
    });

    const svc = await prisma.providerService.create({
      data: {
        providerProfileId: providerProfile.id,
        title: 'Serviço fixo',
        description: 'desc',
        fixedPrice: 200,
        categoryId,
      },
    });

    return prisma.serviceOrder.create({
      data: {
        clientId: clientUserId,
        providerId: providerUserId,
        providerServiceId: svc.id,
        agreedPrice: 200,
        title: 'Serviço fixo',
        description: 'desc',
        categoryId,
        status: 'IN_PROGRESS',
      },
    });
  }

  describe('GET /services/:orderId/tracking — fee redaction', () => {
    it('should redact feeAmount/netAmount for CLIENT and expose for PROVIDER', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);

      // Open order via API then propose/accept to establish ownership
      const orderId = (await createOrderAsClient(client.token, cat.id)).body.id as string;

      const proposalId = (
        await request(app.getHttpServer())
          .post('/api/v1/proposals')
          .set(bearerAuth(provider.token))
          .send({ serviceOrderId: orderId, price: 180, description: 'Faço' })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/accept`)
        .set(bearerAuth(client.token))
        .expect(201);

      // Need a PAID payment for grossAmount to be resolved; create via prisma directly
      await prisma.payment.create({
        data: {
          serviceOrderId: orderId,
          amount: 180,
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      const asProvider = (
        await request(app.getHttpServer())
          .get(`/api/v1/services/${orderId}/tracking`)
          .set(bearerAuth(provider.token))
          .expect(200)
      ).body;

      expect(asProvider.orderId).toBe(orderId);
      expect(asProvider.grossAmount).toBe(180);
      expect(asProvider.feeAmount).toBe(18);
      expect(asProvider.netAmount).toBe(162);

      const asClient = (
        await request(app.getHttpServer())
          .get(`/api/v1/services/${orderId}/tracking`)
          .set(bearerAuth(client.token))
          .expect(200)
      ).body;

      expect(asClient.grossAmount).toBe(180);
      expect(asClient.feeAmount).toBeUndefined();
      expect(asClient.netAmount).toBeUndefined();
    });

    it('should return 403 when caller is not owner/provider and 401 without token', async () => {
      const client = await clientAuth();
      const outsider = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (await createOrderAsClient(client.token, cat.id)).body.id as string;

      await request(app.getHttpServer())
        .get(`/api/v1/services/${orderId}/tracking`)
        .set(bearerAuth(outsider.token))
        .expect(403);

      await request(app.getHttpServer()).get(`/api/v1/services/${orderId}/tracking`).expect(401);
    });
  });

  describe('POST /services/me/:orderId/start — idempotent', () => {
    it('should set startedAt on first call and be idempotent on second', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);

      const order = await hireOrder(client.user.id, provider.user.id, cat.id);

      await prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: 200,
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      const first = (
        await request(app.getHttpServer())
          .post(`/api/v1/services/me/${order.id}/start`)
          .set(bearerAuth(provider.token))
          .expect(201)
      ).body;

      expect(first.startedAt).toBeDefined();

      const second = (
        await request(app.getHttpServer())
          .post(`/api/v1/services/me/${order.id}/start`)
          .set(bearerAuth(provider.token))
          .expect(201)
      ).body;

      expect(second.startedAt).toBeDefined();
      expect(second.startedAt).toBe(first.startedAt);
    });

    it('should return 403 when non-owner provider tries to start', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const stranger = await providerAuth();
      const cat = await createCategory(prisma);

      const order = await hireOrder(client.user.id, provider.user.id, cat.id);

      await prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: 200,
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/start`)
        .set(bearerAuth(stranger.token))
        .expect(403);
    });
  });

  describe('POST /services/me/:orderId/finish — multipart with photo', () => {
    it('should finish with multipart photo and observations → COMPLETED', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);

      const order = await hireOrder(client.user.id, provider.user.id, cat.id);

      await prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: 200,
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Must start before finish
      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/start`)
        .set(bearerAuth(provider.token))
        .expect(201);

      expect(mockMinio.uploadFile).toHaveBeenCalledTimes(0);

      const finished = (
        await request(app.getHttpServer())
          .post(`/api/v1/services/me/${order.id}/finish`)
          .set(bearerAuth(provider.token))
          .field('observations', 'Concluído com sucesso')
          .attach('photos', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' })
          .expect(201)
      ).body;

      expect(finished.orderStatus).toBe('COMPLETED');
      expect(finished.evidence).toBeDefined();
      expect(finished.evidence.observations).toBe('Concluído com sucesso');
      expect(finished.evidence.photos.length).toBeGreaterThanOrEqual(1);
      expect(mockMinio.uploadFile).toHaveBeenCalled();
    });

    it('should return 400 when finishing without any photo', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);

      const order = await hireOrder(client.user.id, provider.user.id, cat.id);

      await prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: 200,
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/start`)
        .set(bearerAuth(provider.token))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/finish`)
        .set(bearerAuth(provider.token))
        .send({ observations: 'sem foto' })
        .expect(400);
    });
  });

  describe('DELETE /services/me/:orderId — cancel', () => {
    it('should cancel from non-final status with reason and expose in tracking', async () => {
      const client = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (await createOrderAsClient(client.token, cat.id)).body.id as string;

      const cancelled = (
        await request(app.getHttpServer())
          .delete(`/api/v1/services/me/${orderId}`)
          .set(bearerAuth(client.token))
          .send({ cancelReason: 'Mudança de planos' })
          .expect(200)
      ).body;

      expect(cancelled.status).toBe('CANCELLED');

      const tracking = (
        await request(app.getHttpServer())
          .get(`/api/v1/services/${orderId}/tracking`)
          .set(bearerAuth(client.token))
          .expect(200)
      ).body;

      expect(tracking.orderStatus).toBe('CANCELLED');
      expect(tracking.cancelReason).toBe('Mudança de planos');
      expect(tracking.cancelledAt).toBeDefined();
    });

    it('should return 403 when outsider tries to cancel', async () => {
      const client = await clientAuth();
      const intruder = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (await createOrderAsClient(client.token, cat.id)).body.id as string;

      await request(app.getHttpServer())
        .delete(`/api/v1/services/me/${orderId}`)
        .set(bearerAuth(intruder.token))
        .send({ cancelReason: 'tentativa' })
        .expect(403);
    });
  });

  describe('timeline events', () => {
    it('should create timeline events for start, finish and cancel', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);

      // Timeline for start/finish
      const order = await hireOrder(client.user.id, provider.user.id, cat.id);
      await prisma.payment.create({
        data: {
          serviceOrderId: order.id,
          amount: 200,
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/start`)
        .set(bearerAuth(provider.token))
        .expect(201);

      const startEvents = await prisma.orderTimelineEvent.findMany({
        where: { serviceOrderId: order.id, eventKey: 'SERVICE_STARTED' },
      });
      expect(startEvents.length).toBeGreaterThanOrEqual(1);

      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/finish`)
        .set(bearerAuth(provider.token))
        .field('observations', 'ok')
        .attach('photos', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201);

      const finishEvents = await prisma.orderTimelineEvent.findMany({
        where: { serviceOrderId: order.id, eventKey: 'SERVICE_COMPLETED' },
      });
      expect(finishEvents.length).toBeGreaterThanOrEqual(1);

      // Timeline for cancel on a separate order
      const orderId2 = (await createOrderAsClient(client.token, cat.id)).body.id as string;
      await request(app.getHttpServer())
        .delete(`/api/v1/services/me/${orderId2}`)
        .set(bearerAuth(client.token))
        .send({ cancelReason: 'timeline check' })
        .expect(200);

      const cancelEvents = await prisma.orderTimelineEvent.findMany({
        where: { serviceOrderId: orderId2, eventKey: 'CANCELLED' },
      });
      expect(cancelEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// Reviews tests — cross-endpoint integration flows

import { INestApplication } from '@nestjs/common';
// Require syntax is needed here: without esModuleInterop a default import
// would be undefined at runtime.
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  createCompletedPaidOrder,
  mintToken,
  bearerAuth,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from "@pode-deixar/prisma";

// --- Integration: Reviews ---

describe('Reviews (integration)', () => {
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

  async function clientAndProvider() {
    const client = await createTestUser(prisma, { role: 'CLIENT' });
    const provider = await createTestUser(prisma, { role: 'PROVIDER' });
    return {
      client,
      provider,
      clientToken: mintToken(client),
      providerToken: mintToken(provider),
    };
  }

  describe('POST /reviews', () => {
    it('allows a client to review the provider of a completed paid order', async () => {
      const { client, provider, clientToken } = await clientAndProvider();
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: order.id,
          rating: 5,
          comment: 'Excelente trabalho',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.reviewer_id).toBe(client.id);
      expect(response.body.reviewee_id).toBe(provider.id);
      expect(response.body.rating).toBe(5);
    });

    it('allows a provider to review the client', async () => {
      const { client, provider, providerToken } = await clientAndProvider();
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(providerToken))
        .send({ serviceOrderId: order.id, rating: 4 })
        .expect(201);

      expect(response.body.reviewer_id).toBe(provider.id);
      expect(response.body.reviewee_id).toBe(client.id);
    });

    it('rejects a second review from the same author (400)', async () => {
      const { client, provider, clientToken } = await clientAndProvider();
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );
      const headers = bearerAuth(clientToken);
      const dto = { serviceOrderId: order.id, rating: 5 };

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(headers)
        .send(dto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(headers)
        .send(dto)
        .expect(400);
    });

    it('returns 403 for users outside the order', async () => {
      const { client, provider } = await clientAndProvider();
      const outsider = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(outsider)))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(403);
    });

    it('returns 404 for a missing order and 400 for an invalid rating', async () => {
      const { client, provider, clientToken } = await clientAndProvider();
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );
      const headers = bearerAuth(clientToken);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(headers)
        .send({
          serviceOrderId: '00000000-0000-0000-0000-000000000000',
          rating: 5,
        })
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(headers)
        .send({ serviceOrderId: order.id, rating: 6 })
        .expect(400);
    });
  });

  describe('GET /reviews/me', () => {
    it('lists reviews written by the user', async () => {
      const { client, provider, clientToken } = await clientAndProvider();
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(clientToken))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/reviews/me')
        .set(bearerAuth(clientToken))
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].reviewer_id).toBe(client.id);
    });
  });

  describe('GET /reviews/service-order/:orderId', () => {
    it('lists reviews for order parties and denies outsiders', async () => {
      const { client, provider, clientToken } = await clientAndProvider();
      const outsider = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(clientToken))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/reviews/service-order/${order.id}`)
        .set(bearerAuth(clientToken))
        .expect(200);
      expect(response.body).toHaveLength(1);

      await request(app.getHttpServer())
        .get(`/api/v1/reviews/service-order/${order.id}`)
        .set(bearerAuth(mintToken(outsider)))
        .expect(403);
    });
  });

  describe('PATCH /reviews/:reviewId', () => {
    it('allows the author to update the rating and comment', async () => {
      const { client, provider, clientToken } = await clientAndProvider();
      const order = await createCompletedPaidOrder(
        prisma,
        client.id,
        provider.id,
      );

      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(clientToken))
          .send({ serviceOrderId: order.id, rating: 3 })
          .expect(201)
      ).body.id as string;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}`)
        .set(bearerAuth(clientToken))
        .send({ rating: 4, comment: 'Melhorou no final' })
        .expect(200);

      expect(response.body.rating).toBe(4);
    });
  });

  describe('GET /reviews/provider/:providerId and /summary', () => {
    it('returns provider listing with pagination meta and privacy', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT', completeName: 'Ana Silva Costa' });
      await prisma.clientProfile.upsert({
        where: { userId: client.id },
        update: { avatarUrl: 'https://cdn.example/a.png' },
        create: { userId: client.id, avatarUrl: 'https://cdn.example/a.png' },
      });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);
      const list = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}?page=1&limit=10`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(list.body.data[0]).not.toHaveProperty('reviewer_id');
      expect(list.body.data[0].reviewer.display_name).toBe('Ana C.');
      expect(list.body.meta).toEqual(expect.objectContaining({ total: expect.any(Number), hasMore: expect.any(Boolean) }));
      const summary = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(summary.body.total).toBe(1);
      expect(summary.body.average).toBe(5);
      expect(summary.body.distribution['5']).toBe(1);
    });

    it('excludes CANCELLED and filters COMPLETED+PAID only', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const cat = await prisma.category.create({ data: { name: `CatI ${Date.now()}_${Math.random()}`, slug: `cati-${Date.now()}_${Math.random()}` } });
      const cancelled = await prisma.serviceOrder.create({
        data: { title: 'Canc', description: 'desc', categoryId: cat.id, clientId: client.id, providerId: provider.id, status: 'CANCELLED' },
      });
      await prisma.payment.create({ data: { serviceOrderId: cancelled.id, amount: 100, method: 'PIX', status: 'PAID' } });
      await prisma.review.create({ data: { serviceOrderId: cancelled.id, reviewerId: client.id, revieweeId: provider.id, rating: 1, comment: 'hidden' } });
      const list = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect((list.body.data as any[]).some((r) => r.comment === 'hidden')).toBe(false);
    });
  });

  describe('GET /reviews/received, responses and reports', () => {
    it('enforces provider-only received (403 for CLIENT) and supports pagination', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      await request(app.getHttpServer()).get('/api/v1/reviews/received').set(bearerAuth(mintToken(client))).expect(403);
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(client))).send({ serviceOrderId: order.id, rating: 5 }).expect(201);
      const rec = await request(app.getHttpServer()).get('/api/v1/reviews/received').set(bearerAuth(mintToken(provider))).expect(200);
      expect(rec.body.data.length).toBeGreaterThanOrEqual(1);
      expect(rec.body.data[0]).toHaveProperty('report_status');
      expect(rec.body.data[0]).not.toHaveProperty('reviewer_id');
    });

    it('creates response (201), 409 duplicate, 403 non-reviewee, embeds in provider listing', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(client))).send({ serviceOrderId: order.id, rating: 5 }).expect(201)).body.id as string;
      await request(app.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearerAuth(mintToken(intruder))).send({ message: 'x' }).expect(403);
      const created = await request(app.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearerAuth(mintToken(provider))).send({ message: 'Obrigado!' }).expect(201);
      expect(created.body.message).toBe('Obrigado!');
      await request(app.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearerAuth(mintToken(provider))).send({ message: 'dup' }).expect(409);
      const updated = await request(app.getHttpServer()).patch(`/api/v1/reviews/${reviewId}/response`).set(bearerAuth(mintToken(provider))).send({ message: 'Atualizado' }).expect(200);
      expect(updated.body.message).toBe('Atualizado');
      const listing = await request(app.getHttpServer()).get(`/api/v1/reviews/provider/${provider.id}`).set(bearerAuth(mintToken(client))).expect(200);
      expect(listing.body.data.find((r: any) => r.id === reviewId).response.message).toBe('Atualizado');
    });

    it('creates report (201), 409 duplicate, content stays visible, 403 non-reviewee', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(client))).send({ serviceOrderId: order.id, rating: 1, comment: 'report me' }).expect(201)).body.id as string;
      await request(app.getHttpServer()).post(`/api/v1/reviews/${reviewId}/reports`).set(bearerAuth(mintToken(intruder))).send({ reason: 'SPAM' }).expect(403);
      const rep = await request(app.getHttpServer()).post(`/api/v1/reviews/${reviewId}/reports`).set(bearerAuth(mintToken(provider))).send({ reason: 'OFENSA' }).expect(201);
      expect(rep.body.status).toBe('PENDING');
      await request(app.getHttpServer()).post(`/api/v1/reviews/${reviewId}/reports`).set(bearerAuth(mintToken(provider))).send({ reason: 'SPAM' }).expect(409);
      const listing = await request(app.getHttpServer()).get(`/api/v1/reviews/provider/${provider.id}`).set(bearerAuth(mintToken(client))).expect(200);
      expect(listing.body.data.find((r: any) => r.id === reviewId).comment).toBe('report me');
    });

    it('recalculates provider rating after POST/PATCH/DELETE (reviews → users)', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      await prisma.providerProfile.upsert({ where: { userId: provider.id }, update: {}, create: { userId: provider.id, bio: 'bio' } });
      const o1 = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const o2 = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const r1 = (await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(client))).send({ serviceOrderId: o1.id, rating: 5 }).expect(201)).body.id as string;
      let prof = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(prof?.rating).toBe(5);
      await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(client))).send({ serviceOrderId: o2.id, rating: 3 }).expect(201);
      prof = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(prof?.rating).toBeCloseTo(4, 1);
      await request(app.getHttpServer()).patch(`/api/v1/reviews/${r1}`).set(bearerAuth(mintToken(client))).send({ rating: 1 }).expect(200);
      prof = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(prof?.rating).toBeCloseTo(2, 1);
      await request(app.getHttpServer()).delete(`/api/v1/reviews/${r1}`).set(bearerAuth(mintToken(client))).expect(200);
      prof = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(prof?.rating).toBe(3);
      const summary = await request(app.getHttpServer()).get(`/api/v1/reviews/provider/${provider.id}/summary`).set(bearerAuth(mintToken(client))).expect(200);
      expect(summary.body.average).toBe(3);
    });
  });
});

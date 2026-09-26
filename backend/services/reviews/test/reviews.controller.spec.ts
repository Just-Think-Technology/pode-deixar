// Reviews controller tests — HTTP status / guard / 403 via request(app)

import { INestApplication } from '@nestjs/common';
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
import { PrismaService } from '@pode-deixar/prisma';

describe('ReviewsController (HTTP)', () => {
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

  describe('POST /reviews', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .send({ serviceOrderId: '00000000-0000-0000-0000-000000000000', rating: 5 })
        .expect(401);
    });

    it('should return 403 when user is not a party to the order', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(intruder)))
        .send({ serviceOrderId: order.id, rating: 5, comment: 'Ótimo' })
        .expect(403);
    });

    it('should return 201 for order party and persist review in DB', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);

      const response = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 5, comment: 'Excelente serviço' })
        .expect(201);

      expect(response.body.rating).toBe(5);
      const db = await prisma.review.findUnique({ where: { id: response.body.id } });
      expect(db?.reviewerId).toBe(client.id);
      expect(db?.revieweeId).toBe(provider.id);
    });

    it('should return 400 for invalid rating', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 6 })
        .expect(400);
    });
  });

  describe('GET /reviews/me', () => {
    it('should return 401 without token and 200 with reviews for owner', async () => {
      await request(app.getHttpServer()).get('/api/v1/reviews/me').expect(401);

      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 4 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/reviews/me')
        .set(bearerAuth(mintToken(client)))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /reviews/service-order/:orderId', () => {
    it('should return 403 when intruder requests order reviews', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);

      await request(app.getHttpServer())
        .get(`/api/v1/reviews/service-order/${order.id}`)
        .set(bearerAuth(mintToken(intruder)))
        .expect(403);
    });

    it('should return 200 for order party', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/reviews/service-order/${order.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PATCH /reviews/:reviewId and DELETE /reviews/:reviewId', () => {
    it('should enforce 403 for non-author on update and delete', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}`)
        .set(bearerAuth(mintToken(intruder)))
        .send({ rating: 4 })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${reviewId}`)
        .set(bearerAuth(mintToken(intruder)))
        .expect(403);
    });

    it('should return 200 for author update and delete', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}`)
        .set(bearerAuth(mintToken(client)))
        .send({ rating: 4 })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${reviewId}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);

      const db = await prisma.review.findUnique({ where: { id: reviewId } });
      expect(db).toBeNull();
    });
  });

  describe('GET /reviews/provider/:providerId', () => {
    it('should return 401 without token', async () => {
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .expect(401);
    });

    it('should return 401 for summary without token', async () => {
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .expect(401);
    });

    it('should return 400 for invalid provider UUID', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      await request(app.getHttpServer())
        .get('/api/v1/reviews/provider/not-a-uuid')
        .set(bearerAuth(mintToken(client)))
        .expect(400);
      await request(app.getHttpServer())
        .get('/api/v1/reviews/provider/not-a-uuid/summary')
        .set(bearerAuth(mintToken(client)))
        .expect(400);
    });

    it('should return 404 when provider not found', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${fakeId}`)
        .set(bearerAuth(mintToken(client)))
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${fakeId}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(404);
    });

    it('should return paginated reviews with privacy shape and hide IDs', async () => {
      const client = await createTestUser(prisma, {
        role: 'CLIENT',
        completeName: 'Ana Silva Costa',
      });
      await prisma.clientProfile.upsert({
        where: { userId: client.id },
        update: { avatarUrl: 'https://cdn.example.com/avatar.png' },
        create: { userId: client.id, avatarUrl: 'https://cdn.example.com/avatar.png' },
      });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 5, comment: 'Excelente' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}?page=1&limit=10`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('rating');
      expect(item).toHaveProperty('comment');
      expect(item).toHaveProperty('created_at');
      expect(item).toHaveProperty('reviewer');
      expect(item.reviewer).toHaveProperty('display_name');
      expect(item.reviewer).toHaveProperty('avatar_url');
      // Privacy: display_name is first + initial, not full name exposure
      expect(item.reviewer.display_name).toBe('Ana C.');
      expect(item.reviewer.avatar_url).toBe('https://cdn.example.com/avatar.png');
      // Never expose internal IDs
      expect(item).not.toHaveProperty('reviewer_id');
      expect(item).not.toHaveProperty('reviewee_id');
      expect(item).not.toHaveProperty('service_order_id');
      expect(item).not.toHaveProperty('reviewerId');
      expect(item).not.toHaveProperty('revieweeId');
      expect(item).toHaveProperty('response');
      expect(res.body.meta).toEqual(
        expect.objectContaining({ total: expect.any(Number), page: 1, limit: 10, hasMore: expect.any(Boolean) }),
      );
    });

    it('should default page 1 limit 10 and cap limit at 50', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const auth = bearerAuth(mintToken(client));
      // Default without query
      const resDefault = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(auth)
        .expect(200);
      expect(resDefault.body.meta.page).toBe(1);
      expect(resDefault.body.meta.limit).toBe(10);
      // Cap
      await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}?page=1&limit=200`)
        .set(auth)
        .expect(400);
    });

    it('should resolve providerId as ProviderProfile.id and User.id', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const profile = await prisma.providerProfile.create({
        data: { userId: provider.id, bio: 'test' },
      });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 4 })
        .expect(201);

      const byUserId = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      const byProfileId = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${profile.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(byUserId.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(byProfileId.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should return summary with distribution 1-5 and average null when no reviews', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const freshProvider = await createTestUser(prisma, { role: 'PROVIDER' });
      const summaryEmpty = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${freshProvider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(summaryEmpty.body).toEqual({
        provider_id: freshProvider.id,
        average: null,
        total: 0,
        distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      });

      // Add review and check aggregate
      const order = await createCompletedPaidOrder(prisma, client.id, freshProvider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const summary = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${freshProvider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(summary.body.provider_id).toBe(freshProvider.id);
      expect(summary.body.total).toBe(1);
      expect(summary.body.average).toBe(5);
      expect(summary.body.distribution['5']).toBe(1);
    });

    it('should include response embedded when review has response', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201)
      ).body.id as string;
      await prisma.reviewResponse.create({
        data: { reviewId, message: 'Obrigado pelo feedback!' },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      const item = res.body.data.find((r: any) => r.id === reviewId);
      expect(item).toBeDefined();
      expect(item.response).toEqual(
        expect.objectContaining({ message: 'Obrigado pelo feedback!', created_at: expect.any(String) }),
      );
    });

    it('should filter COMPLETED+PAID only via aggregate and listing', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const cat = await prisma.category.create({
        data: { name: `Cat ${Date.now()}_${Math.random()}`, slug: `cat-${Date.now()}_${Math.random()}` },
      });
      // Create order NOT completed but with review inserted directly (bypass service guard)
      const pendingOrder = await prisma.serviceOrder.create({
        data: {
          title: 'Pendente',
          description: 'desc',
          categoryId: cat.id,
          clientId: client.id,
          providerId: provider.id,
          status: 'OPEN',
        },
      });
      await prisma.payment.create({
        data: { serviceOrderId: pendingOrder.id, amount: 100, method: 'PIX', status: 'PAID' },
      });
      await prisma.review.create({
        data: {
          serviceOrderId: pendingOrder.id,
          reviewerId: client.id,
          revieweeId: provider.id,
          rating: 1,
          comment: 'Should be hidden',
        },
      });
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      // The hidden review should not appear
      const hasHidden = (res.body.data as any[]).some((r) => r.comment === 'Should be hidden');
      expect(hasHidden).toBe(false);
      const summary = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      // Distribution should not count the hidden rating 1
      expect(summary.body.distribution['1']).toBe(0);
    });

    it('should exclude CANCELLED orders from listing and summary', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const cat = await prisma.category.create({
        data: { name: `CatC ${Date.now()}_${Math.random()}`, slug: `catc-${Date.now()}_${Math.random()}` },
      });
      const cancelledOrder = await prisma.serviceOrder.create({
        data: {
          title: 'Cancelado',
          description: 'desc',
          categoryId: cat.id,
          clientId: client.id,
          providerId: provider.id,
          status: 'CANCELLED',
        },
      });
      await prisma.payment.create({
        data: { serviceOrderId: cancelledOrder.id, amount: 100, method: 'PIX', status: 'PAID' },
      });
      await prisma.review.create({
        data: {
          serviceOrderId: cancelledOrder.id,
          reviewerId: client.id,
          revieweeId: provider.id,
          rating: 5,
          comment: 'Cancelled hidden',
        },
      });
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect((res.body.data as any[]).some((r) => r.comment === 'Cancelled hidden')).toBe(false);
      const summary = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      // Total should be 0 or at least not count the cancelled review rating 5
      // For fresh provider, total 0 ; check distribution not polluted
      expect(summary.body.distribution['5']).toBe(0);
    });

    it('should compute average and distribution correctly with multiple ratings', async () => {
      const c1 = await createTestUser(prisma, { role: 'CLIENT' });
      const c2 = await createTestUser(prisma, { role: 'CLIENT' });
      const c3 = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const o1 = await createCompletedPaidOrder(prisma, c1.id, provider.id);
      const o2 = await createCompletedPaidOrder(prisma, c2.id, provider.id);
      const o3 = await createCompletedPaidOrder(prisma, c3.id, provider.id);
      await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(c1))).send({ serviceOrderId: o1.id, rating: 5 }).expect(201);
      await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(c2))).send({ serviceOrderId: o2.id, rating: 3 }).expect(201);
      await request(app.getHttpServer()).post('/api/v1/reviews').set(bearerAuth(mintToken(c3))).send({ serviceOrderId: o3.id, rating: 4 }).expect(201);
      const summary = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .set(bearerAuth(mintToken(c1)))
        .expect(200);
      expect(summary.body.total).toBe(3);
      expect(summary.body.average).toBeCloseTo(4.0, 1);
      expect(summary.body.distribution).toEqual({ '1': 0, '2': 0, '3': 1, '4': 1, '5': 1 });
    });

    it('should report hasMore correctly with pagination boundaries', async () => {
      const clients = await Promise.all([0, 1, 2].map(() => createTestUser(prisma, { role: 'CLIENT' })));
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      for (let i = 0; i < 3; i++) {
        const order = await createCompletedPaidOrder(prisma, clients[i].id, provider.id);
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(clients[i])))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201);
      }
      const p1 = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}?page=1&limit=2`)
        .set(bearerAuth(mintToken(clients[0])))
        .expect(200);
      expect(p1.body.meta.hasMore).toBe(true);
      expect(p1.body.meta.total).toBe(3);
      const p2 = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}?page=2&limit=2`)
        .set(bearerAuth(mintToken(clients[0])))
        .expect(200);
      expect(p2.body.meta.hasMore).toBe(false);
      expect(p2.body.data.length).toBe(1);
    });
  });

  describe('GET /reviews/received', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/reviews/received').expect(401);
    });

    it('should return 403 for CLIENT role (provider only)', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      await request(app.getHttpServer())
        .get('/api/v1/reviews/received')
        .set(bearerAuth(mintToken(client)))
        .expect(403);
    });

    it('should return paginated received reviews with privacy and report_status', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT', completeName: 'João Pedro Alves' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 4, comment: 'Bom' })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/received?page=1&limit=10')
        .set(bearerAuth(mintToken(provider)))
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).not.toHaveProperty('reviewer_id');
      expect(item).not.toHaveProperty('reviewee_id');
      expect(item).toHaveProperty('reviewer');
      expect(item.reviewer.display_name).toBe('João A.');
      expect(item).toHaveProperty('report_status');
      expect(['NONE', 'PENDING', 'RESOLVED']).toContain(item.report_status);
      expect(item).toHaveProperty('response');
      expect(res.body.meta.hasMore).toBe(false);
    });

    it('should isolate received: provider B sees only own reviews', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const providerA = await createTestUser(prisma, { role: 'PROVIDER' });
      const providerB = await createTestUser(prisma, { role: 'PROVIDER' });
      const orderA = await createCompletedPaidOrder(prisma, client.id, providerA.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: orderA.id, rating: 5 })
        .expect(201);
      const resB = await request(app.getHttpServer())
        .get('/api/v1/reviews/received')
        .set(bearerAuth(mintToken(providerB)))
        .expect(200);
      // Provider B has no reviews, so total 0 and no leakage
      expect(resB.body.meta.total).toBe(0);
      expect(resB.body.data.length).toBe(0);
    });

    it('should include response embedded and report_status PENDING after report', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 2, comment: 'Ruim' })
          .expect(201)
      ).body.id as string;
      await prisma.reviewResponse.create({ data: { reviewId, message: 'Vamos melhorar' } });
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(mintToken(provider)))
        .send({ reason: 'OFENSA' })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/v1/reviews/received')
        .set(bearerAuth(mintToken(provider)))
        .expect(200);
      const item = res.body.data.find((r: any) => r.id === reviewId);
      expect(item).toBeDefined();
      // Response visible
      expect(item.response).toEqual(expect.objectContaining({ message: 'Vamos melhorar' }));
      // Report status PENDING
      expect(item.report_status).toBe('PENDING');
      // Privacy still holds
      expect(item).not.toHaveProperty('reviewer_id');
    });
  });

  describe('POST /reviews/:reviewId/response and PATCH', () => {
    it('should return 401 without token for response endpoints', async () => {
      const fake = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer()).post(`/api/v1/reviews/${fake}/response`).send({ message: 'oi' }).expect(401);
      await request(app.getHttpServer()).patch(`/api/v1/reviews/${fake}/response`).send({ message: 'oi' }).expect(401);
    });

    it('should return 400 for invalid UUID and 400 for empty message', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      await request(app.getHttpServer())
        .post('/api/v1/reviews/not-a-uuid/response')
        .set(bearerAuth(mintToken(client)))
        .send({ message: 'oi' })
        .expect(400);
      await request(app.getHttpServer())
        .patch('/api/v1/reviews/not-a-uuid/response')
        .set(bearerAuth(mintToken(client)))
        .send({ message: 'oi' })
        .expect(400);
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const c2 = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, c2.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(c2)))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201)
      ).body.id as string;
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: '' })
        .expect(400);
    });

    it('should return 404 when review not found', async () => {
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const fake = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${fake}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Obrigado' })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${fake}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Atualizado' })
        .expect(404);
    });

    it('should return 403 when non-reviewee tries to respond', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201)
      ).body.id as string;
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(intruder)))
        .send({ message: 'Fake' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(intruder)))
        .send({ message: 'Fake' })
        .expect(403);
      // Also the reviewer (client) cannot respond to own review — only reviewee (provider) may
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(client)))
        .send({ message: 'Fake' })
        .expect(403);
    });

    it('should create response 201 and return 409 on duplicate', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 5 })
          .expect(201)
      ).body.id as string;
      const created = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Obrigado pelo feedback!' })
        .expect(201);
      expect(created.body.message).toBe('Obrigado pelo feedback!');
      expect(created.body.review_id).toBe(reviewId);
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Segunda' })
        .expect(409);
      // Also visible via provider listing
      const listing = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      const item = listing.body.data.find((r: any) => r.id === reviewId);
      expect(item.response.message).toBe('Obrigado pelo feedback!');
    });

    it('should update response 200 and return 404 when no response exists', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 4 })
          .expect(201)
      ).body.id as string;
      // No response yet -> 404
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Tentativa' })
        .expect(404);
      // Create then update
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Original' })
        .expect(201);
      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(provider)))
        .send({ message: 'Atualizado' })
        .expect(200);
      expect(updated.body.message).toBe('Atualizado');
      // 403 for non-reviewee on update
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(mintToken(intruder)))
        .send({ message: 'Hack' })
        .expect(403);
    });
  });

  describe('POST /reviews/:reviewId/reports', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews/00000000-0000-0000-0000-000000000000/reports')
        .send({ reason: 'OFENSA' })
        .expect(401);
    });

    it('should return 400 for invalid UUID or reason', async () => {
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      await request(app.getHttpServer())
        .post('/api/v1/reviews/not-a-uuid/reports')
        .set(bearerAuth(mintToken(provider)))
        .send({ reason: 'OFENSA' })
        .expect(400);
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const prov2 = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, prov2.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 1 })
          .expect(201)
      ).body.id as string;
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(mintToken(prov2)))
        .send({ reason: 'INVALID' })
        .expect(400);
    });

    it('should return 404 when review not found and 403 when not reviewee', async () => {
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const fake = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${fake}/reports`)
        .set(bearerAuth(mintToken(provider)))
        .send({ reason: 'SPAM' })
        .expect(404);
      const otherProvider = await createTestUser(prisma, { role: 'PROVIDER' });
      const otherClient = await createTestUser(prisma, { role: 'CLIENT' });
      const order = await createCompletedPaidOrder(prisma, otherClient.id, otherProvider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(otherClient)))
          .send({ serviceOrderId: order.id, rating: 2 })
          .expect(201)
      ).body.id as string;
      // Intruder not reviewee
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(mintToken(provider)))
        .send({ reason: 'SPAM' })
        .expect(403);
      // Reviewer (client) cannot report own review toward provider — only reviewee may report
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(mintToken(otherClient)))
        .send({ reason: 'SPAM' })
        .expect(403);
    });

    it('should create report 201 and return 409 on duplicate, content remains visible', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT', completeName: 'Maria Souza' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const reviewId = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order.id, rating: 1, comment: 'Conteúdo denunciado' })
          .expect(201)
      ).body.id as string;
      const report = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(mintToken(provider)))
        .send({ reason: 'OFENSA', description: 'Ofensa grave' })
        .expect(201);
      expect(report.body.review_id).toBe(reviewId);
      expect(report.body.status).toBe('PENDING');
      // Duplicate -> 409
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(mintToken(provider)))
        .send({ reason: 'OFENSA' })
        .expect(409);
      // Content remains visible in provider listing (reports do not hide review)
      const listing = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      const item = listing.body.data.find((r: any) => r.id === reviewId);
      expect(item).toBeDefined();
      expect(item.comment).toBe('Conteúdo denunciado');
      // And in received with report_status PENDING
      const received = await request(app.getHttpServer())
        .get('/api/v1/reviews/received')
        .set(bearerAuth(mintToken(provider)))
        .expect(200);
      const rec = received.body.data.find((r: any) => r.id === reviewId);
      expect(rec.report_status).toBe('PENDING');
    });
  });

  describe('recalc after POST/PATCH/DELETE', () => {
    it('should recalc provider rating after create, update and delete', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      // Ensure provider profile exists for rating check
      await prisma.providerProfile.upsert({
        where: { userId: provider.id },
        update: {},
        create: { userId: provider.id, bio: 'bio' },
      });
      const order1 = await createCompletedPaidOrder(prisma, client.id, provider.id);
      const order2 = await createCompletedPaidOrder(prisma, client.id, provider.id);
      // Use two different clients for second review to avoid unique constraint, but reuse client with two orders is allowed? Actually unique is per order+reviewer, so same client can review different orders to same provider — allowed.
      // Create first review rating 5
      const r1 = (
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set(bearerAuth(mintToken(client)))
          .send({ serviceOrderId: order1.id, rating: 5 })
          .expect(201)
      ).body.id as string;
      let profile = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(profile?.rating).toBe(5);
      expect(profile?.totalReviews).toBe(1);
      // Create second review rating 3 (need other client? Actually reuse same client with different order is allowed — let's use same client)
      // Create review via same client on order2 to second provider rating average 4
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order2.id, rating: 3 })
        .expect(201);
      profile = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(profile?.rating).toBeCloseTo(4.0, 1);
      expect(profile?.totalReviews).toBe(2);
      // PATCH first review 5 -> 1, average should become 2
      await request(app.getHttpServer())
        .patch(`/api/v1/reviews/${r1}`)
        .set(bearerAuth(mintToken(client)))
        .send({ rating: 1 })
        .expect(200);
      profile = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(profile?.rating).toBeCloseTo(2.0, 1);
      expect(profile?.totalReviews).toBe(2);
      // Summary should reflect recalc
      const summary = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(summary.body.average).toBeCloseTo(2.0, 1);
      expect(summary.body.total).toBe(2);
      // DELETE first review, remaining rating 3 -> average 3
      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${r1}`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      profile = await prisma.providerProfile.findUnique({ where: { userId: provider.id } });
      expect(profile?.rating).toBe(3);
      expect(profile?.totalReviews).toBe(1);
      const summary2 = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}/summary`)
        .set(bearerAuth(mintToken(client)))
        .expect(200);
      expect(summary2.body.average).toBe(3);
      expect(summary2.body.total).toBe(1);
    });
  });
});

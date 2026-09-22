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
  });
});

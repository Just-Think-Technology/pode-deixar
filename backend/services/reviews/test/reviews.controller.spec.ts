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

  describe('GET /reviews/provider/:providerId (public)', () => {
    it('should return 200 without token and list public reviews', async () => {
      const client = await createTestUser(prisma, { role: 'CLIENT' });
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const order = await createCompletedPaidOrder(prisma, client.id, provider.id);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(mintToken(client)))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/reviews/provider/${provider.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for invalid provider UUID', async () => {
      await request(app.getHttpServer()).get('/api/v1/reviews/provider/not-a-uuid').expect(400);
    });
  });
});

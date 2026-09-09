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
import { PrismaService } from '../src/prisma/prisma.service';

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
        .post('/reviews')
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
        .post('/reviews')
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
        .post('/reviews')
        .set(headers)
        .send(dto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/reviews')
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
        .post('/reviews')
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
        .post('/reviews')
        .set(headers)
        .send({
          serviceOrderId: '00000000-0000-0000-0000-000000000000',
          rating: 5,
        })
        .expect(404);

      await request(app.getHttpServer())
        .post('/reviews')
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
        .post('/reviews')
        .set(bearerAuth(clientToken))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/reviews/me')
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
        .post('/reviews')
        .set(bearerAuth(clientToken))
        .send({ serviceOrderId: order.id, rating: 5 })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/reviews/service-order/${order.id}`)
        .set(bearerAuth(clientToken))
        .expect(200);
      expect(response.body).toHaveLength(1);

      await request(app.getHttpServer())
        .get(`/reviews/service-order/${order.id}`)
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
          .post('/reviews')
          .set(bearerAuth(clientToken))
          .send({ serviceOrderId: order.id, rating: 3 })
          .expect(201)
      ).body.id as string;

      const response = await request(app.getHttpServer())
        .patch(`/reviews/${reviewId}`)
        .set(bearerAuth(clientToken))
        .send({ rating: 4, comment: 'Melhorou no final' })
        .expect(200);

      expect(response.body.rating).toBe(4);
    });
  });
});

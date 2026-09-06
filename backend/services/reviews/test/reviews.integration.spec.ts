import { INestApplication } from '@nestjs/common';
// import-require: estes serviços não têm esModuleInterop (diferente do auth),
// então o default-import compila para `.default` inexistente em runtime.
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

// ─── Integration: Avaliações (HTTP + banco real) ───────────────────────────

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
    it('deve permitir cliente avaliar prestador de pedido concluído e pago', async () => {
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

    it('deve permitir prestador avaliar cliente', async () => {
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

    it('deve rejeitar segunda avaliação do mesmo autor (400)', async () => {
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

    it('deve retornar 403 para quem não é parte do pedido', async () => {
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

    it('deve retornar 404 para pedido inexistente e 400 para nota inválida', async () => {
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
    it('deve listar avaliações escritas pelo usuário', async () => {
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
    it('deve listar para as partes e negar para terceiros', async () => {
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
    it('deve permitir ao autor atualizar nota e comentário', async () => {
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

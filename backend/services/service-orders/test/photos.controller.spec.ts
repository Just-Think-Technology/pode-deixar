// Photos controller tests — HTTP status / guard / 403 via request(app)

import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('PhotosController (HTTP)', () => {
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

  async function clientWithOrder() {
    const user = await createTestUser(prisma, { role: 'CLIENT' });
    const token = mintToken(user);
    const category = await createCategory(prisma);
    const order = await prisma.serviceOrder.create({
      data: {
        title: 'Pedido fotos',
        description: 'Descrição',
        categoryId: category.id,
        clientId: user.id,
        status: 'OPEN',
      },
    });
    return { user, token, order };
  }

  describe('POST /services/me/:orderId/photos', () => {
    it('should return 401 without token', async () => {
      const { order } = await clientWithOrder();
      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/photos`)
        .expect(401);
    });

    it('should return 403 when provider tries to upload on client-only endpoint', async () => {
      const { order } = await clientWithOrder();
      const provider = await createTestUser(prisma, { role: 'PROVIDER' });
      const token = mintToken(provider);

      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/photos`)
        .set(bearerAuth(token))
        .attach('photos', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);
    });

    it('should return 400 when no files sent', async () => {
      const { token, order } = await clientWithOrder();
      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/photos`)
        .set(bearerAuth(token))
        .expect(400);
    });

    it('should return 403 when another client tries to upload on чужое order', async () => {
      const { order } = await clientWithOrder();
      const intruder = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(intruder);
      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/photos`)
        .set(bearerAuth(token))
        .attach('photos', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);
    });

    it('should return 201 and persist photo for owner client with valid png', async () => {
      const { token, order } = await clientWithOrder();
      const response = await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/photos`)
        .set(bearerAuth(token))
        .attach('photos', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201);

      const body = Array.isArray(response.body) ? response.body : [response.body];
      expect(body[0].url ?? body[0].photoUrl ?? body[0].id).toBeDefined();

      const photos = await prisma.orderPhoto.findMany({ where: { serviceOrderId: order.id } });
      expect(photos.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for invalid file type (magic-byte validation)', async () => {
      const { token, order } = await clientWithOrder();
      await request(app.getHttpServer())
        .post(`/api/v1/services/me/${order.id}/photos`)
        .set(bearerAuth(token))
        .attach('photos', Buffer.from('not-an-image'), { filename: 'doc.txt', contentType: 'text/plain' })
        .expect(400);
    });
  });

  describe('GET /services/photos/:photoId/view', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/services/photos/00000000-0000-0000-0000-000000000000/view')
        .expect(401);
    });

    it('should return 404 for nonexistent photo', async () => {
      const user = await createTestUser(prisma, { role: 'CLIENT' });
      const token = mintToken(user);
      await request(app.getHttpServer())
        .get('/api/v1/services/photos/00000000-0000-0000-0000-000000000000/view')
        .set(bearerAuth(token))
        .expect(404);
    });
  });
});

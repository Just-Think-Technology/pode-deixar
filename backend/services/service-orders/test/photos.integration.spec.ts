// Photos tests — cross-endpoint integration flows

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

// --- Integration: Photos ---

describe('Photos (integration)', () => {
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

  async function hireOrderForCompletion(
    clientId: string,
    providerId: string,
    categoryId: string,
  ) {
    const profile = await prisma.providerProfile.upsert({
      where: { userId: providerId },
      update: {},
      create: { userId: providerId, bio: 'Prestador' },
    });
    const svc = await prisma.providerService.create({
      data: {
        providerProfileId: profile.id,
        title: 'Serviço foto',
        description: 'desc',
        fixedPrice: 100,
        categoryId,
      },
    });
    return prisma.serviceOrder.create({
      data: {
        clientId,
        providerId,
        providerServiceId: svc.id,
        agreedPrice: 100,
        title: 'Serviço foto',
        description: 'desc',
        categoryId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  describe('POST /services/me/:orderId/photos — client upload', () => {
    it('should upload valid PNG and return view URL (mock)', async () => {
      const client = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (
        await request(app.getHttpServer())
          .post('/services/me')
          .set(bearerAuth(client.token))
          .send({
            title: 'Foto pedido',
            description: 'Descrição com foto',
            categoryId: cat.id,
          })
          .expect(201)
      ).body.id as string;

      const response = await request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .set(bearerAuth(client.token))
        .attach('photos', PNG_1X1, { filename: 'local.png', contentType: 'image/png' })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].url).toMatch(/^\/api\/services\/photos\/.+\/view$/);
      expect(mockMinio.uploadFile).toHaveBeenCalled();
    });

    it('should enforce 10-photos-per-order total limit', async () => {
      const client = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (
        await request(app.getHttpServer())
          .post('/services/me')
          .set(bearerAuth(client.token))
          .send({
            title: 'Limite fotos',
            description: 'Teste limite 10',
            categoryId: cat.id,
          })
          .expect(201)
      ).body.id as string;

      // Upload 10 files in one request (max per request = 10, per order = 10)
      const attach10 = Array.from({ length: 10 }, () => ({
        buffer: PNG_1X1,
        filename: `foto-${Math.random().toString(36).slice(2)}.png`,
      }));
      let req = request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .set(bearerAuth(client.token));
      for (const f of attach10) {
        req = req.attach('photos', f.buffer, { filename: f.filename, contentType: 'image/png' });
      }
      await req.expect(201);

      // 11th photo should exceed total limit → 400
      await request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .set(bearerAuth(client.token))
        .attach('photos', PNG_1X1, { filename: 'extra.png', contentType: 'image/png' })
        .expect(400);
    });

    it('should reject file with invalid magic bytes (magic-byte validation)', async () => {
      const client = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (
        await request(app.getHttpServer())
          .post('/services/me')
          .set(bearerAuth(client.token))
          .send({
            title: 'Magic bytes',
            description: 'Teste magic',
            categoryId: cat.id,
          })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .set(bearerAuth(client.token))
        .attach('photos', Buffer.from('not-an-image-content'), {
          filename: 'fake.png',
          contentType: 'image/png',
        })
        .expect(400);
    });

    it('should return 401 without token, 403 for non-owner and 404 for missing order', async () => {
      const client = await clientAuth();
      const intruder = await clientAuth();
      const cat = await createCategory(prisma);

      const orderId = (
        await request(app.getHttpServer())
          .post('/services/me')
          .set(bearerAuth(client.token))
          .send({
            title: 'Auth foto',
            description: 'auth check',
            categoryId: cat.id,
          })
          .expect(201)
      ).body.id as string;

      await request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .attach('photos', PNG_1X1, { filename: 'a.png', contentType: 'image/png' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .set(bearerAuth(intruder.token))
        .attach('photos', PNG_1X1, { filename: 'a.png', contentType: 'image/png' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/services/me/00000000-0000-0000-0000-000000000000/photos')
        .set(bearerAuth(client.token))
        .attach('photos', PNG_1X1, { filename: 'a.png', contentType: 'image/png' })
        .expect(404);
    });
  });

  describe('POST /services/me/:orderId/completion-photos — provider upload + view/delete', () => {
    it('should allow provider to upload completion photo, view presigned URL and delete', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);

      const order = await hireOrderForCompletion(client.user.id, provider.user.id, cat.id);

      // Provider upload completion photo (multipart)
      const uploaded = await request(app.getHttpServer())
        .post(`/services/me/${order.id}/completion-photos`)
        .set(bearerAuth(provider.token))
        .attach('photos', PNG_1X1, { filename: 'evidencia.png', contentType: 'image/png' })
        .expect(201);

      const photoId = (Array.isArray(uploaded.body) ? uploaded.body[0].id : uploaded.body.id) as string;
      expect(photoId).toBeDefined();

      // View presigned URL (owner client, provider owner, or ADMIN; provider has proposal)
      const viewAsProvider = await request(app.getHttpServer())
        .get(`/services/photos/${photoId}/view`)
        .set(bearerAuth(provider.token))
        .expect(200);
      expect(viewAsProvider.body.url).toContain('X-Amz-Signature=mock');

      const viewAsClient = await request(app.getHttpServer())
        .get(`/services/photos/${photoId}/view`)
        .set(bearerAuth(client.token))
        .expect(200);
      expect(viewAsClient.body.url).toContain('X-Amz-Signature=mock');

      // Delete completion photo (provider owner)
      await request(app.getHttpServer())
        .delete(`/services/me/${order.id}/completion-photos/${photoId}`)
        .set(bearerAuth(provider.token))
        .expect(200);

      expect(mockMinio.deleteFile).toHaveBeenCalled();

      // After delete, view should be 404
      await request(app.getHttpServer())
        .get(`/services/photos/${photoId}/view`)
        .set(bearerAuth(provider.token))
        .expect(404);
    });

    it('should return 403 when outsider tries to view or delete photo', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const outsiderClient = await clientAuth();
      const outsiderProvider = await providerAuth();
      const cat = await createCategory(prisma);

      const order = await hireOrderForCompletion(client.user.id, provider.user.id, cat.id);

      const uploaded = await request(app.getHttpServer())
        .post(`/services/me/${order.id}/completion-photos`)
        .set(bearerAuth(provider.token))
        .attach('photos', PNG_1X1, { filename: 'evidencia2.png', contentType: 'image/png' })
        .expect(201);

      const photoId = (Array.isArray(uploaded.body) ? uploaded.body[0].id : uploaded.body.id) as string;

      // Outsider client not owner → 403
      await request(app.getHttpServer())
        .get(`/services/photos/${photoId}/view`)
        .set(bearerAuth(outsiderClient.token))
        .expect(403);

      // Outsider provider without proposal → 403
      await request(app.getHttpServer())
        .delete(`/services/me/${order.id}/completion-photos/${photoId}`)
        .set(bearerAuth(outsiderProvider.token))
        .expect(403);

      // Unauthenticated → 401
      await request(app.getHttpServer()).get(`/services/photos/${photoId}/view`).expect(401);
    });
  });
});

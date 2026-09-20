// Complete service vertical slice — order→proposal→accept→complete with photo webp + history

import request from 'supertest';
import {
  bootApps,
  shutdownApps,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  mockMinio,
  E2EApps,
} from './apps';

// 1x1 PNG (transparent) — sharp converts to webp on the server
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Complete service feature (order→proposal→accept→complete + webp + history)', () => {
  let apps: E2EApps;
  let clientToken: string;
  let providerToken: string;
  let outsiderToken: string;
  let clientId: string;
  let providerId: string;
  let categoryId: string;
  let orderId: string;
  let proposalId: string;
  let photoId: string;

  beforeAll(async () => {
    apps = await bootApps();
    const client = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const provider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const outsider = await createTestUser(apps.prisma, { role: 'CLIENT' });
    clientId = client.id;
    providerId = provider.id;
    clientToken = mintToken(client);
    providerToken = mintToken(provider);
    outsiderToken = mintToken(outsider);
    const category = await createCategory(apps.prisma);
    categoryId = category.id;
  }, 180000);

  afterAll(async () => {
    await shutdownApps(apps);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. client creates order → OPEN', async () => {
    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Reparo hidráulico completo',
          description: 'Vazamento na cozinha com troca de registro',
          categoryId,
        })
        .expect(201)
    ).body;

    orderId = order.id as string;
    expect(order.status).toBe('OPEN');
    expect(order.client_id).toBe(clientId);

    const dbOrder = await apps.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
    expect(dbOrder).toBeDefined();
    expect(dbOrder?.status).toBe('OPEN');
  });

  it('2. provider proposes → PENDING', async () => {
    const proposal = (
      await request(apps.ordersApp.getHttpServer())
        .post('/proposals')
        .set(bearerAuth(providerToken))
        .send({
          serviceOrderId: orderId,
          price: 220,
          description: 'Faço amanhã com garantia',
        })
        .expect(201)
    ).body;

    proposalId = proposal.id as string;
    expect(proposal.status).toBe('PENDING');

    const dbProposal = await apps.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    expect(dbProposal?.serviceOrderId).toBe(orderId);
  });

  it('3. client accepts proposal → IN_PROGRESS', async () => {
    const accepted = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/proposals/${proposalId}/accept`)
        .set(bearerAuth(clientToken))
        .expect(201)
    ).body;
    expect(accepted.status).toBe('ACCEPTED');

    const dbOrder = await apps.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
    expect(dbOrder?.status).toBe('IN_PROGRESS');
    expect(dbOrder?.providerId).toBe(providerId);
  });

  it('4. complete without any photo → 400', async () => {
    await request(apps.ordersApp.getHttpServer())
      .post(`/services/me/${orderId}/complete`)
      .set(bearerAuth(providerToken))
      .send({ observations: 'Tentativa sem foto' })
      .expect(400);

    await request(apps.ordersApp.getHttpServer())
      .post(`/services/me/${orderId}/finish`)
      .set(bearerAuth(providerToken))
      .send({ observations: 'Tentativa finish sem foto' })
      .expect(400);
  });

  it('5. provider uploads PNG evidence → stored as webp + view URL', async () => {
    const uploaded = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/completion-photos`)
        .set(bearerAuth(providerToken))
        .attach('photos', PNG_1X1, { filename: 'evidencia.png', contentType: 'image/png' })
        .expect(201)
    ).body;

    const photo = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    photoId = photo.id as string;
    expect(photoId).toBeDefined();
    expect(photo.url).toMatch(/^\/api\/services\/photos\/.+\/view$/);

    // MinIO stub: file stored as .webp with image/webp mime, buffer is webp (RIFF/WEBP)
    expect(mockMinio.uploadFile).toHaveBeenCalledTimes(1);
    const [fileName, buffer, mime] = mockMinio.uploadFile.mock.calls[0] as unknown as [
      string,
      Buffer,
      string,
    ];
    expect(fileName).toMatch(/\.webp$/);
    expect(mime).toBe('image/webp');
    expect(buffer.slice(0, 4).toString()).toBe('RIFF');
    expect(buffer.slice(8, 12).toString()).toBe('WEBP');

    const dbPhoto = await apps.prisma.orderPhoto.findUnique({
      where: { id: photoId },
    });
    expect(dbPhoto?.serviceOrderId).toBe(orderId);
    expect(dbPhoto?.url).toContain('.webp');

    const count = await apps.prisma.orderPhoto.count({
      where: { serviceOrderId: orderId },
    });
    expect(count).toBe(1);
  });

  it('6. provider completes with observations → COMPLETED + history shape', async () => {
    const completed = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/services/me/${orderId}/complete`)
        .set(bearerAuth(providerToken))
        .send({ observations: 'Serviço concluído com troca de registro' })
        .expect(201)
    ).body;

    expect(completed.order_id).toBe(orderId);
    expect(completed.completed_at).toBeDefined();
    expect(completed.completed_by).toBe(providerId);
    expect(completed.observations).toBe('Serviço concluído com troca de registro');
    expect(completed.photos).toHaveLength(1);
    expect(completed.photos[0].id).toBe(photoId);
    expect(completed.photos[0].url).toMatch(/^\/api\/services\/photos\/.+\/view$/);

    const dbOrder = await apps.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
    expect(dbOrder?.status).toBe('COMPLETED');
    expect(dbOrder?.completedBy).toBe(providerId);
    expect(dbOrder?.observations).toBe('Serviço concluído com troca de registro');
    expect(dbOrder?.completedAt).toBeDefined();
  });

  it('7. GET /services/me/:orderId/completion → history for owner, 403 for outsider', async () => {
    const asProvider = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/me/${orderId}/completion`)
        .set(bearerAuth(providerToken))
        .expect(200)
    ).body;
    expect(asProvider.order_id).toBe(orderId);
    expect(asProvider.photos).toHaveLength(1);
    expect(asProvider.observations).toBe('Serviço concluído com troca de registro');

    const asClient = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/me/${orderId}/completion`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(asClient.order_id).toBe(orderId);
    expect(asClient.photos[0].id).toBe(photoId);

    await request(apps.ordersApp.getHttpServer())
      .get(`/services/me/${orderId}/completion`)
      .set(bearerAuth(outsiderToken))
      .expect(403);

    await request(apps.ordersApp.getHttpServer())
      .get(`/services/me/${orderId}/completion`)
      .expect(401);

    // Non-completed order → 404 history
    const openOrderId = (
      await request(apps.ordersApp.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Outro serviço ainda aberto',
          description: 'Descrição válida para pedido aberto',
          categoryId,
        })
        .expect(201)
    ).body.id as string;

    await request(apps.ordersApp.getHttpServer())
      .get(`/services/me/${openOrderId}/completion`)
      .set(bearerAuth(clientToken))
      .expect(404);
  });

  it('8. GET /services/photos/:photoId/view → presigned URL, 403 for outsider', async () => {
    const asProvider = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/photos/${photoId}/view`)
        .set(bearerAuth(providerToken))
        .expect(200)
    ).body;
    expect(asProvider.url).toContain('X-Amz-Signature=mock');

    const asClient = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/photos/${photoId}/view`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(asClient.url).toContain('X-Amz-Signature=mock');

    await request(apps.ordersApp.getHttpServer())
      .get(`/services/photos/${photoId}/view`)
      .set(bearerAuth(outsiderToken))
      .expect(403);

    await request(apps.ordersApp.getHttpServer())
      .get(`/services/photos/${photoId}/view`)
      .expect(401);

    expect(mockMinio.generateTemporaryUrl).toHaveBeenCalled();
  });

  it('9. GET /services/:orderId/tracking → evidence when COMPLETED', async () => {
    const tracking = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/services/${orderId}/tracking`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;

    expect(tracking.orderId).toBe(orderId);
    expect(tracking.orderStatus).toBe('COMPLETED');
    expect(tracking.evidence).toBeDefined();
    expect(tracking.evidence.photos).toHaveLength(1);
    expect(tracking.evidence.completedAt).toBeDefined();

    await request(apps.ordersApp.getHttpServer())
      .get(`/services/${orderId}/tracking`)
      .set(bearerAuth(outsiderToken))
      .expect(403);
  });

  it('10. idempotency: second complete → 400, photo upload after COMPLETED → 400', async () => {
    await request(apps.ordersApp.getHttpServer())
      .post(`/services/me/${orderId}/complete`)
      .set(bearerAuth(providerToken))
      .send({ observations: 'segunda tentativa' })
      .expect(400);

    await request(apps.ordersApp.getHttpServer())
      .post(`/services/me/${orderId}/completion-photos`)
      .set(bearerAuth(providerToken))
      .attach('photos', PNG_1X1, { filename: 'extra.png', contentType: 'image/png' })
      .expect(400);
  });
});

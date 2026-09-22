// Provider journey tests — cross-service provider flows

import request from 'supertest';
import {
  bootApps,
  shutdownApps,
  createTestUser,
  createCategory,
  mintToken,
  bearerAuth,
  E2EApps,
} from './apps';

// --- Provider Journey ---

// Profile (users) → service → order (orders) → proposal → acceptance → completion
// → payment + webhook (payments) → review (reviews) → rating reflected
// on the profile (users). All in the same database, as in production.

describe('Provider journey (cross-service e2e)', () => {
  let apps: E2EApps;
  let clientToken: string;
  let providerToken: string;
  let clientId: string;
  let providerId: string;
  let providerProfileId: string;
  let categoryId: string;
  let orderId: string;
  let proposalId: string;
  let paymentId: string;

  const previousWebhookKey = process.env.MOCK_WEBHOOK_KEY;

  beforeAll(async () => {
    apps = await bootApps();
    process.env.MOCK_WEBHOOK_KEY = 'test-webhook-key';

    const client = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const provider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    clientId = client.id;
    providerId = provider.id;
    clientToken = mintToken(client);
    providerToken = mintToken(provider);

    const category = await createCategory(apps.prisma);
    categoryId = category.id;
  }, 180000);

  afterAll(async () => {
    if (previousWebhookKey === undefined) {
      delete process.env.MOCK_WEBHOOK_KEY;
    } else {
      process.env.MOCK_WEBHOOK_KEY = previousWebhookKey;
    }
    await shutdownApps(apps);
  });

  it('1. provider creates profile and registers a service (users)', async () => {
    const clientHeaders = bearerAuth(clientToken);
    const providerHeaders = bearerAuth(providerToken);

    // The client also needs a profile to exist in the ecosystem
    await request(apps.usersApp.getHttpServer())
      .post('/api/v1/profiles/client')
      .set(clientHeaders)
      .send({})
      .expect(201);

    const profile = (
      await request(apps.usersApp.getHttpServer())
        .post('/api/v1/profiles/provider')
        .set(providerHeaders)
        .send({ bio: 'Eletricista experiente', hourlyRate: 80 })
        .expect(201)
    ).body;
    providerProfileId = profile.id as string;
    expect(providerProfileId).toBeDefined();

    const service = (
      await request(apps.usersApp.getHttpServer())
        .post('/api/v1/providers/me/services')
        .set(providerHeaders)
        .send({
          title: 'Instalação de chuveiro',
          description: 'Instalação completa com garantia',
          fixedPrice: 150,
          categoryId,
        })
        .expect(201)
    ).body;
    expect(service.fixed_price).toBe(150);
  });

  it('2. client creates an order (orders)', async () => {
    const order = (
      await request(apps.ordersApp.getHttpServer())
        .post('/api/v1/services/me')
        .set(bearerAuth(clientToken))
        .send({
          title: 'Chuveiro queimado',
          description: 'Preciso trocar o chuveiro ainda hoje',
          categoryId,
        })
        .expect(201)
    ).body;

    orderId = order.id as string;
    expect(order.status).toBe('OPEN');
    expect(order.client_id).toBe(clientId);
  });

  it('3. provider sends a proposal (orders)', async () => {
    const proposal = (
      await request(apps.ordersApp.getHttpServer())
        .post('/api/v1/proposals')
        .set(bearerAuth(providerToken))
        .send({
          serviceOrderId: orderId,
          price: 180,
          description: 'Faço hoje à tarde',
        })
        .expect(201)
    ).body;

    proposalId = proposal.id as string;
    expect(proposal.status).toBe('PENDING');
  });

  it('4. client accepts the proposal (orders)', async () => {
    const accepted = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/api/v1/proposals/${proposalId}/accept`)
        .set(bearerAuth(clientToken))
        .expect(201)
    ).body;

    expect(accepted.status).toBe('ACCEPTED');

    const order = (
      await request(apps.ordersApp.getHttpServer())
        .get(`/api/v1/services/me/${orderId}`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(order.status).toBe('IN_PROGRESS');
  });

  it('5. provider completes the service (orders)', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await request(apps.ordersApp.getHttpServer())
      .post(`/api/v1/services/me/${orderId}/completion-photos`)
      .set(bearerAuth(providerToken))
      .attach('file', png1x1, {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .expect(201);

    const completed = (
      await request(apps.ordersApp.getHttpServer())
        .post(`/api/v1/services/me/${orderId}/complete`)
        .set(bearerAuth(providerToken))
        .send({ observations: 'Serviço concluído' })
        .expect(201)
    ).body;

    expect(completed.order_id).toBe(orderId);
    expect(completed.completed_at).toBeDefined();
  });

  it('6. client generates payment and confirms via webhook (payments)', async () => {
    const payment = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/api/v1/payments')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          method: 'PIX',
          scheduledAt: '2030-01-01T10:00:00.000Z',
        })
        .expect(201)
    ).body;
    paymentId = payment.id as string;
    expect(payment.status).toBe('PENDING');

    const confirmed = (
      await request(apps.paymentsApp.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('x-webhook-key', 'test-webhook-key')
        .send({
          paymentId,
          eventId: `evt_e2e_${Date.now()}`,
          externalId: 'tx_mock_e2e_1',
          amount: 180,
          // Anti-replay timestamp is now required.
          timestamp: String(Math.floor(Date.now() / 1000)),
        })
        .expect(201)
    ).body;
    expect(confirmed.payment.status).toBe('PAID');
  });

  it('7. client reviews and the rating reflects on the profile (reviews → users)', async () => {
    const review = (
      await request(apps.reviewsApp.getHttpServer())
        .post('/api/v1/reviews')
        .set(bearerAuth(clientToken))
        .send({
          serviceOrderId: orderId,
          rating: 5,
          comment: 'Serviço impecável',
        })
        .expect(201)
    ).body;

    expect(review.reviewer_id).toBe(clientId);
    expect(review.reviewee_id).toBe(providerId);

    // Cross-service assertion: the reviews-service recalculated the rating
    // on the SAME table the users-service reads.
    const profile = (
      await request(apps.usersApp.getHttpServer())
        .get(`/api/v1/providers/${providerProfileId}/profile`)
        .expect(200)
    ).body;

    expect(profile.rating).toBe(5);
    expect(profile.total_reviews).toBe(1);
    expect(profile.services).toHaveLength(1);
  });

  it('8. provider reputation — summary, listing, received, response, reports and recalc (reviews)', async () => {
    const reviewId = (
      await apps.prisma.review.findFirst({ where: { serviceOrderId: orderId, reviewerId: clientId } })
    )?.id as string;
    expect(reviewId).toBeDefined();

    // Summary: average 5, total 1, distribution
    const summary = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}/summary`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(summary.provider_id).toBe(providerId);
    expect(summary.average).toBe(5);
    expect(summary.total).toBe(1);
    expect(summary.distribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 1 });

    // Listing: paginated with meta.hasMore, privacy shape, no ID leak, response embedded (null initially)
    const listing = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}?page=1&limit=10`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(listing.meta).toEqual(expect.objectContaining({ total: 1, page: 1, limit: 10, hasMore: false }));
    expect(listing.data[0]).not.toHaveProperty('reviewer_id');
    expect(listing.data[0]).toHaveProperty('reviewer');
    expect(listing.data[0]).toHaveProperty('response');
    expect(listing.data[0].response).toBeNull();

    // Also resolve via ProviderProfile.id
    const byProfile = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerProfileId}?page=1&limit=10`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(byProfile.meta.total).toBe(1);

    // Received: provider only — CLIENT gets 403
    await request(apps.reviewsApp.getHttpServer())
      .get('/api/v1/reviews/received')
      .set(bearerAuth(clientToken))
      .expect(403);
    const received = (
      await request(apps.reviewsApp.getHttpServer())
        .get('/api/v1/reviews/received?page=1&limit=10')
        .set(bearerAuth(providerToken))
        .expect(200)
    ).body;
    expect(received.data.length).toBe(1);
    expect(received.data[0].id).toBe(reviewId);
    expect(received.data[0]).not.toHaveProperty('reviewer_id');
    expect(received.data[0]).toHaveProperty('report_status', 'NONE');

    // Response: provider (reviewee) creates response 201, duplicate 409, non-reviewee 403, embedded in listing
    await request(apps.reviewsApp.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/response`)
      .set(bearerAuth(clientToken))
      .send({ message: 'tentativa cliente' })
      .expect(403);
    const respCreated = (
      await request(apps.reviewsApp.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(providerToken))
        .send({ message: 'Obrigado pelo feedback!' })
        .expect(201)
    ).body;
    expect(respCreated.message).toBe('Obrigado pelo feedback!');
    await request(apps.reviewsApp.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/response`)
      .set(bearerAuth(providerToken))
      .send({ message: 'dup' })
      .expect(409);
    const updatedResp = (
      await request(apps.reviewsApp.getHttpServer())
        .patch(`/api/v1/reviews/${reviewId}/response`)
        .set(bearerAuth(providerToken))
        .send({ message: 'Resposta atualizada' })
        .expect(200)
    ).body;
    expect(updatedResp.message).toBe('Resposta atualizada');
    await request(apps.reviewsApp.getHttpServer())
      .patch(`/api/v1/reviews/${reviewId}/response`)
      .set(bearerAuth(clientToken))
      .send({ message: 'hack' })
      .expect(403);
    // Response now embedded in provider listing and received
    const listingWithResp = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(listingWithResp.data[0].response.message).toBe('Resposta atualizada');
    const receivedWithResp = (
      await request(apps.reviewsApp.getHttpServer())
        .get('/api/v1/reviews/received')
        .set(bearerAuth(providerToken))
        .expect(200)
    ).body;
    expect(receivedWithResp.data[0].response.message).toBe('Resposta atualizada');

    // Reports: provider reports own received review 201, duplicate 409, non-reviewee 403, content stays visible
    await request(apps.reviewsApp.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/reports`)
      .set(bearerAuth(clientToken))
      .send({ reason: 'SPAM' })
      .expect(403);
    const report = (
      await request(apps.reviewsApp.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/reports`)
        .set(bearerAuth(providerToken))
        .send({ reason: 'OFENSA', description: 'Conteúdo ofensivo' })
        .expect(201)
    ).body;
    expect(report.status).toBe('PENDING');
    await request(apps.reviewsApp.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/reports`)
      .set(bearerAuth(providerToken))
      .send({ reason: 'SPAM' })
      .expect(409);
    // Content still visible after report
    const afterReport = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(afterReport.data[0].comment).toBe('Serviço impecável');
    const receivedReported = (
      await request(apps.reviewsApp.getHttpServer())
        .get('/api/v1/reviews/received')
        .set(bearerAuth(providerToken))
        .expect(200)
    ).body;
    expect(receivedReported.data[0].report_status).toBe('PENDING');

    // Recalc after PATCH and DELETE: patch rating 5 -> 3, then delete (before CANCELLED insert to keep global profile clean)
    await request(apps.reviewsApp.getHttpServer())
      .patch(`/api/v1/reviews/${reviewId}`)
      .set(bearerAuth(clientToken))
      .send({ rating: 3 })
      .expect(200);
    const afterPatch = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}/summary`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(afterPatch.average).toBe(3);
    expect(afterPatch.distribution['3']).toBe(1);
    let prof = await apps.prisma.providerProfile.findUnique({ where: { userId: providerId } });
    expect(prof?.rating).toBe(3);
    // Delete review
    await request(apps.reviewsApp.getHttpServer())
      .delete(`/api/v1/reviews/${reviewId}`)
      .set(bearerAuth(clientToken))
      .expect(200);
    const afterDelete = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}/summary`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    expect(afterDelete.total).toBe(0);
    expect(afterDelete.average).toBeNull();
    prof = await apps.prisma.providerProfile.findUnique({ where: { userId: providerId } });
    expect(prof?.totalReviews).toBe(0);

    // CANCELLED review must not affect summary/listing (exclude CANCELLED) — inserted after recalc so profile recalc not polluted above
    const cat = await createCategory(apps.prisma);
    const cancelledOrder = await apps.prisma.serviceOrder.create({
      data: {
        title: 'Cancelado e2e',
        description: 'desc',
        categoryId: cat.id,
        clientId,
        providerId,
        status: 'CANCELLED',
      },
    });
    await apps.prisma.payment.create({ data: { serviceOrderId: cancelledOrder.id, amount: 100, method: 'PIX', status: 'PAID' } });
    await apps.prisma.review.create({
      data: { serviceOrderId: cancelledOrder.id, reviewerId: clientId, revieweeId: providerId, rating: 1, comment: 'hidden cancelled' },
    });
    const afterCancelled = (
      await request(apps.reviewsApp.getHttpServer())
        .get(`/api/v1/reviews/provider/${providerId}/summary`)
        .set(bearerAuth(clientToken))
        .expect(200)
    ).body;
    // Still total 0, distribution 1 stays 0 — CANCELLED excluded
    expect(afterCancelled.total).toBe(0);
    expect(afterCancelled.distribution['1']).toBe(0);
  });
});

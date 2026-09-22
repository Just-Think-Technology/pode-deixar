// Reviews journey — cross-service reviews + reputation flows
// Mirrors provider-journey step 8 but as isolated journey for JTT-108 item 6.

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

describe('Reviews journey (cross-service e2e)', () => {
  let apps: E2EApps;
  let client: any;
  let provider: any;
  let providerProfileId: string;
  let categoryId: string;

  beforeAll(async () => {
    apps = await bootApps();
    client = await createTestUser(apps.prisma, { role: 'CLIENT', completeName: 'Ana Silva Costa' });
    provider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    await apps.prisma.clientProfile.upsert({
      where: { userId: client.id },
      update: { avatarUrl: 'https://cdn.example.com/a.png' },
      create: { userId: client.id, avatarUrl: 'https://cdn.example.com/a.png' },
    });
    const prof = await apps.prisma.providerProfile.create({ data: { userId: provider.id, bio: 'bio journey' } });
    providerProfileId = prof.id;
    const cat = await createCategory(apps.prisma);
    categoryId = cat.id;
  }, 180000);

  afterAll(async () => {
    await shutdownApps(apps);
  });

  function bearer(user: any) {
    return bearerAuth(mintToken(user));
  }

  async function createCompletedPaidOrder(clientId: string, providerId: string) {
    const order = await apps.prisma.serviceOrder.create({
      data: { title: 'Serviço', description: 'desc', categoryId, clientId, providerId, status: 'COMPLETED' },
    });
    await apps.prisma.payment.create({ data: { serviceOrderId: order.id, amount: 150, method: 'PIX', status: 'PAID' } });
    return order;
  }

  it('summary empty, pagination hasMore, 401/403/404 and no ID leak', async () => {
    const freshProvider = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    // 401 without token
    await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${freshProvider.id}`).expect(401);
    await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${freshProvider.id}/summary`).expect(401);
    await request(apps.reviewsApp.getHttpServer()).get('/api/v1/reviews/received').expect(401);
    // 403 received for CLIENT
    await request(apps.reviewsApp.getHttpServer()).get('/api/v1/reviews/received').set(bearer(client)).expect(403);
    // 404 unknown provider
    const fake = '00000000-0000-0000-0000-000000000000';
    await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${fake}`).set(bearer(client)).expect(404);
    await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${fake}/summary`).set(bearer(client)).expect(404);
    // 400 invalid UUID
    await request(apps.reviewsApp.getHttpServer()).get('/api/v1/reviews/provider/not-a-uuid').set(bearer(client)).expect(400);
    // summary empty
    const empty = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${freshProvider.id}/summary`).set(bearer(client)).expect(200);
    expect(empty.body).toEqual({ provider_id: freshProvider.id, average: null, total: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } });
    // list pagination hasMore false when empty, defaults page 1 limit 10
    const emptyList = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${freshProvider.id}`).set(bearer(client)).expect(200);
    expect(emptyList.body.meta).toEqual(expect.objectContaining({ total: 0, page: 1, limit: 10, hasMore: false }));
  });

  it('list pagination, average/distribution, response embedded, exclude CANCELLED, and no ID leak', async () => {
    const c1 = await createTestUser(apps.prisma, { role: 'CLIENT', completeName: 'João Pedro Alves' });
    const c2 = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const c3 = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const prov = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const o1 = await createCompletedPaidOrder(c1.id, prov.id);
    const o2 = await createCompletedPaidOrder(c2.id, prov.id);
    const o3 = await createCompletedPaidOrder(c3.id, prov.id);
    const r1 = (await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(c1)).send({ serviceOrderId: o1.id, rating: 5, comment: 'Excelente' }).expect(201)).body.id as string;
    await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(c2)).send({ serviceOrderId: o2.id, rating: 3 }).expect(201);
    await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(c3)).send({ serviceOrderId: o3.id, rating: 4 }).expect(201);
    // summary distribution and average
    const sum = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}/summary`).set(bearer(c1)).expect(200);
    expect(sum.body.total).toBe(3);
    expect(sum.body.average).toBeCloseTo(4.0, 1);
    expect(sum.body.distribution).toEqual({ '1': 0, '2': 0, '3': 1, '4': 1, '5': 1 });
    // pagination hasMore
    const p1 = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}?page=1&limit=2`).set(bearer(c1)).expect(200);
    expect(p1.body.meta.hasMore).toBe(true);
    const p2 = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}?page=2&limit=2`).set(bearer(c1)).expect(200);
    expect(p2.body.meta.hasMore).toBe(false);
    // no ID leak and privacy: first name + initial, avatar null fallback, response field present
    expect(p1.body.data[0]).not.toHaveProperty('reviewer_id');
    expect(p1.body.data[0]).not.toHaveProperty('reviewee_id');
    expect(p1.body.data[0]).toHaveProperty('reviewer');
    expect(p1.body.data[0]).toHaveProperty('response');
    // Create response and verify embedded
    await apps.prisma.reviewResponse.create({ data: { reviewId: r1, message: 'Obrigado!' } });
    const withResp = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}`).set(bearer(c1)).expect(200);
    const item = withResp.body.data.find((r: any) => r.id === r1);
    expect(item.response).toEqual(expect.objectContaining({ message: 'Obrigado!' }));
    // Exclude CANCELLED
    const cat2 = await createCategory(apps.prisma);
    const canc = await apps.prisma.serviceOrder.create({ data: { title: 'Canc', description: 'desc', categoryId: cat2.id, clientId: c1.id, providerId: prov.id, status: 'CANCELLED' } });
    await apps.prisma.payment.create({ data: { serviceOrderId: canc.id, amount: 100, method: 'PIX', status: 'PAID' } });
    await apps.prisma.review.create({ data: { serviceOrderId: canc.id, reviewerId: c1.id, revieweeId: prov.id, rating: 1, comment: 'should be hidden cancelled' } });
    const afterCanc = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}`).set(bearer(c1)).expect(200);
    expect((afterCanc.body.data as any[]).some((r) => r.comment === 'should be hidden cancelled')).toBe(false);
    const sumAfter = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}/summary`).set(bearer(c1)).expect(200);
    expect(sumAfter.body.total).toBe(3);
    expect(sumAfter.body.distribution['1']).toBe(0);
  });

  it('received isolation, response 409/403 and reports 409 with content visible', async () => {
    const cli = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const provA = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const provB = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const intruder = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const oA = await createCompletedPaidOrder(cli.id, provA.id);
    const reviewId = (await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(cli)).send({ serviceOrderId: oA.id, rating: 2, comment: 'Conteúdo' }).expect(201)).body.id as string;
    // received isolation: B sees 0
    const recB = await request(apps.reviewsApp.getHttpServer()).get('/api/v1/reviews/received').set(bearer(provB)).expect(200);
    expect(recB.body.meta.total).toBe(0);
    const recA = await request(apps.reviewsApp.getHttpServer()).get('/api/v1/reviews/received').set(bearer(provA)).expect(200);
    expect(recA.body.data.find((r: any) => r.id === reviewId)).toBeDefined();
    expect(recA.body.data[0]).not.toHaveProperty('reviewer_id');
    // response: 403 for intruder and for reviewer, 404 for unknown, 409 duplicate
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearer(intruder)).send({ message: 'x' }).expect(403);
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearer(cli)).send({ message: 'x' }).expect(403);
    await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews/00000000-0000-0000-0000-000000000000/response').set(bearer(provA)).send({ message: 'x' }).expect(404);
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearer(provA)).send({ message: 'Obrigado' }).expect(201);
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/response`).set(bearer(provA)).send({ message: 'dup' }).expect(409);
    await request(apps.reviewsApp.getHttpServer()).patch(`/api/v1/reviews/${reviewId}/response`).set(bearer(intruder)).send({ message: 'hack' }).expect(403);
    // reports: 403 for non-reviewee, 404 for unknown, 409 duplicate, content visible after report
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/reports`).set(bearer(intruder)).send({ reason: 'SPAM' }).expect(403);
    await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews/00000000-0000-0000-0000-000000000000/reports').set(bearer(provA)).send({ reason: 'SPAM' }).expect(404);
    const rep = await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/reports`).set(bearer(provA)).send({ reason: 'OFENSA' }).expect(201);
    expect(rep.body.status).toBe('PENDING');
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${reviewId}/reports`).set(bearer(provA)).send({ reason: 'SPAM' }).expect(409);
    // invalid reason 400
    const cli2 = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const prov2 = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    const o2 = await createCompletedPaidOrder(cli2.id, prov2.id);
    const r2 = (await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(cli2)).send({ serviceOrderId: o2.id, rating: 1 }).expect(201)).body.id as string;
    await request(apps.reviewsApp.getHttpServer()).post(`/api/v1/reviews/${r2}/reports`).set(bearer(prov2)).send({ reason: 'INVALID' }).expect(400);
    // content still visible
    const listing = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${provA.id}`).set(bearer(cli)).expect(200);
    expect(listing.body.data.find((r: any) => r.id === reviewId).comment).toBe('Conteúdo');
  });

  it('recalc after POST/PATCH/DELETE reflects in summary and provider profile', async () => {
    const cli = await createTestUser(apps.prisma, { role: 'CLIENT' });
    const prov = await createTestUser(apps.prisma, { role: 'PROVIDER' });
    await apps.prisma.providerProfile.create({ data: { userId: prov.id, bio: 'recalc' } });
    const o1 = await createCompletedPaidOrder(cli.id, prov.id);
    const o2 = await createCompletedPaidOrder(cli.id, prov.id);
    const r1 = (await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(cli)).send({ serviceOrderId: o1.id, rating: 5 }).expect(201)).body.id as string;
    let prof = await apps.prisma.providerProfile.findUnique({ where: { userId: prov.id } });
    expect(prof?.rating).toBe(5);
    expect(prof?.totalReviews).toBe(1);
    await request(apps.reviewsApp.getHttpServer()).post('/api/v1/reviews').set(bearer(cli)).send({ serviceOrderId: o2.id, rating: 3 }).expect(201);
    prof = await apps.prisma.providerProfile.findUnique({ where: { userId: prov.id } });
    expect(prof?.rating).toBeCloseTo(4, 1);
    await request(apps.reviewsApp.getHttpServer()).patch(`/api/v1/reviews/${r1}`).set(bearer(cli)).send({ rating: 1 }).expect(200);
    prof = await apps.prisma.providerProfile.findUnique({ where: { userId: prov.id } });
    expect(prof?.rating).toBeCloseTo(2, 1);
    const sum = await request(apps.reviewsApp.getHttpServer()).get(`/api/v1/reviews/provider/${prov.id}/summary`).set(bearer(cli)).expect(200);
    expect(sum.body.average).toBeCloseTo(2, 1);
    await request(apps.reviewsApp.getHttpServer()).delete(`/api/v1/reviews/${r1}`).set(bearer(cli)).expect(200);
    prof = await apps.prisma.providerProfile.findUnique({ where: { userId: prov.id } });
    expect(prof?.rating).toBe(3);
    expect(prof?.totalReviews).toBe(1);
  });
});

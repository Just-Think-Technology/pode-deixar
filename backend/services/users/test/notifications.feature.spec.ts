// Notifications tests — cross-endpoint integration flows

import { INestApplication } from '@nestjs/common';
// import-require: these services lack esModuleInterop (unlike auth),
// so the default import compiles to a nonexistent `.default` at runtime.
import request = require('supertest');
import { App } from 'supertest/types';
import {
  setupTestApp,
  teardownTestApp,
  createTestUser,
  mintToken,
  bearerAuth,
  TestAppSetup,
} from './test-setup';
import { PrismaService } from '@pode-deixar/prisma';

// --- Integration: Notifications ---

describe('Notifications (integration)', () => {
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

  describe('POST /notifications', () => {
    it('should create a notification and return 201', async () => {
      const { token, user } = await clientAuth();

      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(bearerAuth(token))
        .send({
          type: 'BUDGET',
          title: 'Novo orçamento',
          message: 'Você recebeu um orçamento',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.type).toBe('BUDGET');
      expect(response.body.title).toBe('Novo orçamento');
      expect(response.body.recipient).toBe(user.id);
      expect(response.body.read).toBe(false);
    });

    it('should ignore forged recipient and force authenticated user', async () => {
      const { token, user } = await clientAuth();
      const other = await createTestUser(prisma, { role: 'CLIENT' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(bearerAuth(token))
        .send({
          recipient: other.id,
          type: 'NEW_MESSAGE',
          title: 'Olá',
          message: 'Teste anti-forgery',
        })
        .expect(201);

      expect(response.body.recipient).toBe(user.id);
      expect(response.body.recipient).not.toBe(other.id);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .send({
          type: 'BUDGET',
          title: 'x',
          message: 'y',
        })
        .expect(401);
    });
  });

  describe('GET /notifications', () => {
    it('should list only own notifications (isolation u2 cannot see c1)', async () => {
      const owner = await clientAuth();
      const intruder = await clientAuth();

      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(bearerAuth(owner.token))
        .send({
          type: 'BUDGET',
          title: 'Privada do dono',
          message: 'so dono vê',
        })
        .expect(201);

      const ownerList = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(bearerAuth(owner.token))
        .expect(200);

      expect(ownerList.body.items.length).toBeGreaterThanOrEqual(1);
      expect(ownerList.body.items.every((n: any) => n.recipient === owner.user.id)).toBe(true);

      const intruderList = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(bearerAuth(intruder.token))
        .expect(200);

      const intruderSeesOwner = intruderList.body.items.some(
        (n: any) => n.title === 'Privada do dono',
      );
      expect(intruderSeesOwner).toBe(false);
    });

    it('should filter by isRead (lido) query', async () => {
      const { token } = await clientAuth();

      const created = (
        await request(app.getHttpServer())
          .post('/api/v1/notifications')
          .set(bearerAuth(token))
          .send({
            type: 'BUDGET',
            title: 'Filtro lido',
            message: 'teste lido=false',
          })
          .expect(201)
      ).body;

      // Initially unread => appears in lido=false, not in lido=true
      const unread = await request(app.getHttpServer())
        .get('/api/v1/notifications?lido=false')
        .set(bearerAuth(token))
        .expect(200);
      expect(unread.body.items.some((n: any) => n.id === created.id)).toBe(true);

      const readEmpty = await request(app.getHttpServer())
        .get('/api/v1/notifications?lido=true')
        .set(bearerAuth(token))
        .expect(200);
      expect(readEmpty.body.items.some((n: any) => n.id === created.id)).toBe(false);

      // Mark as read then it moves to lido=true
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${created.id}/read`)
        .set(bearerAuth(token))
        .expect(200);

      const readNow = await request(app.getHttpServer())
        .get('/api/v1/notifications?lido=true')
        .set(bearerAuth(token))
        .expect(200);
      expect(readNow.body.items.some((n: any) => n.id === created.id)).toBe(true);
    });

    it('should expose type field for type filter consumers', async () => {
      const { token } = await clientAuth();

      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(bearerAuth(token))
        .send({
          type: 'BUDGET',
          title: 'Tipo BUDGET',
          message: 'orçamento',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(bearerAuth(token))
        .send({
          type: 'NEW_MESSAGE',
          title: 'Tipo NEW_MESSAGE',
          message: 'mensagem',
        })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(bearerAuth(token))
        .expect(200);

      const types = list.body.items.map((n: any) => n.type);
      expect(types).toContain('BUDGET');
      expect(types).toContain('NEW_MESSAGE');
      // Client-side type filter still works because type is persisted and returned
      const budgetOnly = list.body.items.filter((n: any) => n.type === 'BUDGET');
      expect(budgetOnly.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark own notification as read', async () => {
      const { token } = await clientAuth();

      const created = (
        await request(app.getHttpServer())
          .post('/api/v1/notifications')
          .set(bearerAuth(token))
          .send({
            type: 'BUDGET',
            title: 'Marcar lida',
            message: 'teste',
          })
          .expect(201)
      ).body;

      const patched = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${created.id}/read`)
        .set(bearerAuth(token))
        .expect(200);

      expect(patched.body.read).toBe(true);
      expect(patched.body.id).toBe(created.id);
    });

    it('should return 400 when trying to mark other user notification (isolation)', async () => {
      const owner = await clientAuth();
      const intruder = await clientAuth();

      const created = (
        await request(app.getHttpServer())
          .post('/api/v1/notifications')
          .set(bearerAuth(owner.token))
          .send({
            type: 'BUDGET',
            title: 'Não é sua',
            message: 'isolamento',
          })
          .expect(201)
      ).body;

      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${created.id}/read`)
        .set(bearerAuth(intruder.token))
        .expect(400);
    });

    it('should return 401 without token for read', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .expect(401);
    });
  });
});

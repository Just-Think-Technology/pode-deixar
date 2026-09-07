import { INestApplication } from '@nestjs/common';
// import-require: estes serviços não têm esModuleInterop (diferente do auth),
// então o default-import compila para `.default` inexistente em runtime.
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
import { PrismaService } from '../src/prisma/prisma.service';

// PNG 1x1 válido (o upload converte para webp via sharp).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// ─── Integration: Pedidos + propostas + fotos (HTTP + banco real) ──────────

describe('Orders & Proposals (integration)', () => {
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

  async function createOrder(token: string, categoryId: string) {
    return request(app.getHttpServer())
      .post('/services/me')
      .set(bearerAuth(token))
      .send({
        title: 'Consertar vazamento',
        description: 'Vazamento na pia da cozinha',
        categoryId,
      })
      .expect(201);
  }

  describe('POST /services/me', () => {
    it('deve criar pedido e retornar 201 com status OPEN', async () => {
      const { token } = await clientAuth();
      const cat = await createCategory(prisma);

      const response = await createOrder(token, cat.id);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('OPEN');
      expect(response.body.title).toBe('Consertar vazamento');
    });

    it('deve retornar 400 sem campos obrigatórios', async () => {
      const { token } = await clientAuth();

      await request(app.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(token))
        .send({})
        .expect(400);
    });

    it('deve retornar 401 sem token e 403 para PROVIDER', async () => {
      const cat = await createCategory(prisma);
      const dto = {
        title: 'x',
        description: 'y'.repeat(10),
        categoryId: cat.id,
      };

      await request(app.getHttpServer())
        .post('/services/me')
        .send(dto)
        .expect(401);

      const { token } = await providerAuth();
      await request(app.getHttpServer())
        .post('/services/me')
        .set(bearerAuth(token))
        .send(dto)
        .expect(403);
    });
  });

  describe('GET /services/me', () => {
    it('deve listar apenas os pedidos do cliente', async () => {
      const { token } = await clientAuth();
      const cat = await createCategory(prisma);

      await createOrder(token, cat.id);

      const response = await request(app.getHttpServer())
        .get('/services/me')
        .set(bearerAuth(token))
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Consertar vazamento');
    });
  });

  describe('POST /proposals', () => {
    it('deve permitir proposta de prestador em pedido aberto', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);
      const orderId = (await createOrder(client.token, cat.id)).body.id;

      const response = await request(app.getHttpServer())
        .post('/proposals')
        .set(bearerAuth(provider.token))
        .send({
          serviceOrderId: orderId,
          price: 200,
          description: 'Faço ainda esta semana',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('PENDING');
    });

    it('deve rejeitar segunda proposta ativa do mesmo prestador', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);
      const orderId = (await createOrder(client.token, cat.id)).body.id;
      const headers = bearerAuth(provider.token);
      const dto = {
        serviceOrderId: orderId,
        price: 200,
        description: 'Proposta',
      };

      await request(app.getHttpServer())
        .post('/proposals')
        .set(headers)
        .send(dto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/proposals')
        .set(headers)
        .send(dto)
        .expect(400);
    });

    it('deve retornar 403 para CLIENT e 404 para pedido inexistente', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();

      await request(app.getHttpServer())
        .post('/proposals')
        .set(bearerAuth(client.token))
        .send({
          serviceOrderId: '00000000-0000-0000-0000-000000000000',
          price: 10,
          description: 'x',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/proposals')
        .set(bearerAuth(provider.token))
        .send({
          serviceOrderId: '00000000-0000-0000-0000-000000000000',
          price: 10,
          description: 'x',
        })
        .expect(404);
    });
  });

  describe('POST /proposals/:proposalId/accept', () => {
    it('deve aceitar proposta do dono e marcar ACCEPTED', async () => {
      const client = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);
      const orderId = (await createOrder(client.token, cat.id)).body.id;

      const proposalId = (
        await request(app.getHttpServer())
          .post('/proposals')
          .set(bearerAuth(provider.token))
          .send({
            serviceOrderId: orderId,
            price: 200,
            description: 'Aceita essa',
          })
          .expect(201)
      ).body.id;

      const response = await request(app.getHttpServer())
        .post(`/proposals/${proposalId}/accept`)
        .set(bearerAuth(client.token))
        .expect(201);

      expect(response.body.status).toBe('ACCEPTED');
    });

    it('deve retornar 403 para cliente que não é dono', async () => {
      const owner = await clientAuth();
      const intruder = await clientAuth();
      const provider = await providerAuth();
      const cat = await createCategory(prisma);
      const orderId = (await createOrder(owner.token, cat.id)).body.id;

      const proposalId = (
        await request(app.getHttpServer())
          .post('/proposals')
          .set(bearerAuth(provider.token))
          .send({
            serviceOrderId: orderId,
            price: 200,
            description: 'Proposta',
          })
          .expect(201)
      ).body.id;

      await request(app.getHttpServer())
        .post(`/proposals/${proposalId}/accept`)
        .set(bearerAuth(intruder.token))
        .expect(403);
    });
  });

  describe('POST /services/me/:orderId/photos', () => {
    it('deve enviar foto válida e retornar URL (MinIO mock)', async () => {
      const { token } = await clientAuth();
      const cat = await createCategory(prisma);
      const orderId = (await createOrder(token, cat.id)).body.id;

      const response = await request(app.getHttpServer())
        .post(`/services/me/${orderId}/photos`)
        .set(bearerAuth(token))
        .attach('photos', PNG_1X1, {
          filename: 'local.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(mockMinio.uploadFile).toHaveBeenCalled();
      // Bucket privado: a resposta expõe o endpoint de visualização
      // autenticado, não a URL direta do MinIO.
      expect(response.body[0].url).toMatch(
        /^\/api\/services\/photos\/.+\/view$/,
      );
    });

    it('deve retornar 404 para pedido inexistente', async () => {
      const { token } = await clientAuth();

      await request(app.getHttpServer())
        .post('/services/me/00000000-0000-0000-0000-000000000000/photos')
        .set(bearerAuth(token))
        .attach('photos', PNG_1X1, {
          filename: 'local.png',
          contentType: 'image/png',
        })
        .expect(404);
    });
  });
});

import { INestApplication } from '@nestjs/common';
// import-require: estes serviços não têm esModuleInterop (diferente do auth),
// então o default-import compila para `.default` inexistente em runtime.
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
import { PrismaService } from '../src/prisma/prisma.service';

// ─── Integration: Serviços do prestador (HTTP + banco real) ────────────────

describe('ProviderServices (integration)', () => {
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

  async function category() {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return prisma.category.create({
      data: { name: `Cat ${suffix}`, slug: `cat-${suffix}` },
    });
  }

  async function providerAuth() {
    const user = await createTestUser(prisma, { role: 'PROVIDER' });
    return { user, token: mintToken(user) };
  }

  async function providerWithProfile() {
    const { user, token } = await providerAuth();
    const profile = (
      await request(app.getHttpServer())
        .post('/profiles/provider')
        .set(bearerAuth(token))
        .send({ bio: 'Prestador' })
        .expect(201)
    ).body;
    return { user, token, profileId: profile.id as string };
  }

  describe('POST /providers/me/services', () => {
    it('deve criar serviço e retornar 201 com fixed_price numérico', async () => {
      const { token } = await providerWithProfile();
      const cat = await category();

      const response = await request(app.getHttpServer())
        .post('/providers/me/services')
        .set(bearerAuth(token))
        .send({
          title: 'Instalação de chuveiro',
          description: 'Instalação completa com garantia',
          fixedPrice: 150.5,
          categoryId: cat.id,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('Instalação de chuveiro');
      expect(response.body.fixed_price).toBe(150.5);
      expect(response.body.category).toMatchObject({ id: cat.id });
    });

    it('deve retornar 400 sem os campos obrigatórios', async () => {
      const { token } = await providerWithProfile();

      await request(app.getHttpServer())
        .post('/providers/me/services')
        .set(bearerAuth(token))
        .send({})
        .expect(400);
    });

    it('deve retornar 401 sem token e 403 para CLIENT', async () => {
      const cat = await category();
      const dto = {
        title: 'x',
        description: 'y',
        fixedPrice: 10,
        categoryId: cat.id,
      };

      await request(app.getHttpServer())
        .post('/providers/me/services')
        .send(dto)
        .expect(401);

      const client = await createTestUser(prisma, { role: 'CLIENT' });
      await request(app.getHttpServer())
        .post('/providers/me/services')
        .set(bearerAuth(mintToken(client)))
        .send(dto)
        .expect(403);
    });
  });

  describe('GET /providers/me/services', () => {
    it('deve listar apenas os serviços do dono', async () => {
      const { token } = await providerWithProfile();
      const cat = await category();
      const headers = bearerAuth(token);
      const dto = {
        title: 'Serviço meu',
        description: 'desc',
        fixedPrice: 99.9,
        categoryId: cat.id,
      };

      await request(app.getHttpServer())
        .post('/providers/me/services')
        .set(headers)
        .send(dto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/providers/me/services')
        .set(headers)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Serviço meu');
    });
  });

  describe('GET /providers/:providerId/services (público)', () => {
    it('deve listar serviços ativos sem autenticação', async () => {
      const { token, profileId } = await providerWithProfile();
      const cat = await category();

      await request(app.getHttpServer())
        .post('/providers/me/services')
        .set(bearerAuth(token))
        .send({
          title: 'Serviço público',
          description: 'desc',
          fixedPrice: 50,
          categoryId: cat.id,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/providers/${profileId}/services`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Serviço público');
    });

    it('deve retornar 404 para prestador inexistente', async () => {
      await request(app.getHttpServer())
        .get('/providers/00000000-0000-0000-0000-000000000000/services')
        .expect(404);
    });
  });

  describe('PATCH /providers/me/services/:serviceId', () => {
    it('deve atualizar o serviço do dono', async () => {
      const { token } = await providerWithProfile();
      const cat = await category();
      const headers = bearerAuth(token);

      const created = (
        await request(app.getHttpServer())
          .post('/providers/me/services')
          .set(headers)
          .send({
            title: 'Antes',
            description: 'desc',
            fixedPrice: 100,
            categoryId: cat.id,
          })
          .expect(201)
      ).body;

      const response = await request(app.getHttpServer())
        .patch(`/providers/me/services/${created.id}`)
        .set(headers)
        .send({ title: 'Depois', fixedPrice: 180 })
        .expect(200);

      expect(response.body.title).toBe('Depois');
      expect(response.body.fixed_price).toBe(180);
    });

    it('deve retornar 403 para serviço de outro prestador', async () => {
      const first = await providerWithProfile();
      const second = await providerWithProfile();
      const cat = await category();

      const created = (
        await request(app.getHttpServer())
          .post('/providers/me/services')
          .set(bearerAuth(first.token))
          .send({
            title: 'Alheio',
            description: 'desc',
            fixedPrice: 100,
            categoryId: cat.id,
          })
          .expect(201)
      ).body;

      await request(app.getHttpServer())
        .patch(`/providers/me/services/${created.id}`)
        .set(bearerAuth(second.token))
        .send({ title: 'Invadido' })
        .expect(403);
    });
  });

  describe('DELETE /providers/me/services/:serviceId', () => {
    it('deve desativar (soft delete) o serviço', async () => {
      const { token, profileId } = await providerWithProfile();
      const cat = await category();
      const headers = bearerAuth(token);

      const created = (
        await request(app.getHttpServer())
          .post('/providers/me/services')
          .set(headers)
          .send({
            title: 'Temporário',
            description: 'desc',
            fixedPrice: 10,
            categoryId: cat.id,
          })
          .expect(201)
      ).body;

      const deleted = (
        await request(app.getHttpServer())
          .delete(`/providers/me/services/${created.id}`)
          .set(headers)
          .expect(200)
      ).body;
      expect(deleted.is_active).toBe(false);

      // Some da listagem pública, que só mostra ativos
      const publicList = (
        await request(app.getHttpServer())
          .get(`/providers/${profileId}/services`)
          .expect(200)
      ).body;
      expect(
        publicList.find((s: any) => s.id === created.id),
      ).toBeUndefined();
    });
  });
});

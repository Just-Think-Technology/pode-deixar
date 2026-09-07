import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  setupTestApp,
  createTestUser,
  registerUser,
  teardownTestApp
} from './test-setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('POST /auth/verify-email', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  afterAll(async () => {
    await teardownTestApp(app, prisma);
  });

  /**
   * Registra um usuário e retorna o token bruto de verificação.
   * Justificativa AppSec: o banco guarda apenas o sha256 do token, então o
   * token bruto vem do eco não-prod do cadastro (equivale ao link do email).
   */
  async function registerAndGetToken(): Promise<{ email: string; token: string }> {
    const user = createTestUser();
    const registro = await registerUser(app, user);

    const token = registro.body.email_verification_token as string;
    if (!token)
      throw new Error('email_verification_token missing after registration');

    return { email: user.email, token };
  }

  describe('Success cases', () => {
    it('should verify email and set emailVerified = true in the DB', async () => {
      const { email, token } = await registerAndGetToken();

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Email verificado com sucesso');

      const updatedUser = await prisma.user.findUnique({ where: { email } });
      expect(updatedUser?.emailVerified).toBe(true);
    });
  });

  describe('Failure cases', () => {
    it('should reject an invalid token with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.message).toContain('Token de verificação inválido');
    });

    it('should reject a missing token with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({})
        .expect(400);
    });

    it('should reject an expired token with 400', async () => {
      const { email, token } = await registerAndGetToken();

      // Force expiry to one second in the past
      await prisma.user.update({
        where: { email },
        data: { emailVerificationExpires: new Date(Date.now() - 1_000) },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token })
        .expect(400);

      expect(response.body.message).toContain('Token de verificação expirou');
    });
  });
});
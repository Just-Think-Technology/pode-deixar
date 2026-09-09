import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from '../email.service';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const CONFIG: Record<string, string | number> = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'secret',
  SMTP_FROM: 'noreply@example.com',
  FRONTEND_URL: 'https://app.example.com',
};

function buildConfigService(overrides: Partial<typeof CONFIG> = {}) {
  const config = { ...CONFIG, ...overrides };
  return {
    get: jest.fn((key: string) => config[key]),
  } as unknown as ConfigService;
}

function buildService(overrides: Partial<typeof CONFIG> = {}) {
  return new EmailService(buildConfigService(overrides));
}

// ─── Tests ──────────────────────────────────────────────────────────────────
// Regressão: cobre o contrato do EmailService sem precisar de banco —
// inclusive a propagação de erros do transporter (regressão corrigida:
// sendMail jamais deve engolir exceção retornando false, pois os callers
// em auth (register/resend/password-reset) tratam falha via try/catch).

describe('EmailService (shared)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  describe('Transporter setup', () => {
    it('deve criar o transporte com TLS obrigatório e valores do ConfigService', () => {
      buildService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: CONFIG.SMTP_HOST,
        port: CONFIG.SMTP_PORT,
        secure: false,
        requireTLS: true,
        tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
        auth: { user: CONFIG.SMTP_USER, pass: CONFIG.SMTP_PASS },
      });
    });

    it('deve usar secure=true quando a porta for 465', () => {
      buildService({ SMTP_PORT: 465 });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465, secure: true }),
      );
    });

    it('deve usar a porta padrão 587 quando não configurada', () => {
      buildService({ SMTP_PORT: undefined as unknown as number });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587, secure: false }),
      );
    });

    it('deve desligar requireTLS com SMTP_REQUIRE_TLS=false (Mailpit local)', () => {
      buildService({ SMTP_PORT: 1025, SMTP_REQUIRE_TLS: 'false' });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 1025, secure: false, requireTLS: false }),
      );
    });

    it('deve manter requireTLS=true com SMTP_REQUIRE_TLS=true explícito', () => {
      buildService({ SMTP_REQUIRE_TLS: 'true' });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ requireTLS: true }),
      );
    });

    it('deve LANCAR em produção quando as credenciais SMTP estiverem ausentes', () => {
      const NODE_ENV_ANTERIOR = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => buildService({ SMTP_PASS: undefined as unknown as string })).toThrow(
          /SMTP não configurado/,
        );
      } finally {
        process.env.NODE_ENV = NODE_ENV_ANTERIOR;
      }
    });

    it('deve apenas avisar e continuar fora de produção sem credenciais', () => {
      expect(() =>
        buildService({ SMTP_PASS: undefined as unknown as string }),
      ).not.toThrow();
    });
  });

  describe('sendEmailVerification()', () => {
    it('deve enviar com destinatário, assunto e URL de verificação', async () => {
      const service = buildService();

      await service.sendEmailVerification('user@example.com', 'token-123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verifique seu endereço de email',
        }),
      );
      const body = mockSendMail.mock.calls[0][0].html as string;
      expect(body).toContain(
        'https://app.example.com/verify-email?token=token-123',
      );
    });

    it('deve retornar true no sucesso', async () => {
      const service = buildService();

      await expect(
        service.sendEmailVerification('user@example.com', 'token-123'),
      ).resolves.toBe(true);
    });

    it('deve codificar o token na URL de verificação', async () => {
      const service = buildService();

      await service.sendEmailVerification('user@example.com', 'a+b/c=d?e&f');

      const body = mockSendMail.mock.calls[0][0].html as string;
      expect(body).toContain(encodeURIComponent('a+b/c=d?e&f'));
      expect(body).not.toContain('a+b/c=d?e&f');
    });

    it('deve PROPAGAR o erro do transporter em vez de retornar false', async () => {
      const service = buildService();
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

      await expect(
        service.sendEmailVerification('user@example.com', 'token-123'),
      ).rejects.toThrow('SMTP connection refused');
    });
  });

  describe('sendPasswordReset()', () => {
    it('deve enviar com destinatário, assunto e URL de reset', async () => {
      const service = buildService();

      await service.sendPasswordReset('user@example.com', 'reset-456');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Redefina sua senha',
        }),
      );
      const body = mockSendMail.mock.calls[0][0].html as string;
      expect(body).toContain(
        'https://app.example.com/reset-password?token=reset-456',
      );
    });

    it('deve retornar true no sucesso', async () => {
      const service = buildService();

      await expect(
        service.sendPasswordReset('user@example.com', 'reset-456'),
      ).resolves.toBe(true);
    });

    it('deve PROPAGAR o erro do transporter em vez de retornar false', async () => {
      const service = buildService();
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

      await expect(
        service.sendPasswordReset('user@example.com', 'reset-456'),
      ).rejects.toThrow('SMTP timeout');
    });
  });

  describe('endurecimento do sink (to/subject)', () => {
    it('deve rejeitar destinatário com CRLF (header injection)', async () => {
      const service = buildService();

      await expect(
        service.sendMail({
          to: 'victim@example.com\r\nBcc: attacker@example.com',
          subject: 'Assunto',
          html: '<p>oi</p>',
        }),
      ).rejects.toThrow(/destinatário inválido/);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('deve rejeitar destinatário com formato inválido ou múltiplos endereços', async () => {
      const service = buildService();

      await expect(
        service.sendMail({ to: 'não-é-email', subject: 'A', html: 'x' }),
      ).rejects.toThrow(/destinatário inválido/);
      await expect(
        service.sendMail({
          to: 'a@example.com, b@example.com',
          subject: 'A',
          html: 'x',
        }),
      ).rejects.toThrow(/destinatário inválido/);
    });

    it('deve achatar CRLF e truncar o assunto em 200 caracteres', async () => {
      const service = buildService();
      const assunto = 'linha1\r\nlinha2\nlinha3' + 'x'.repeat(300);

      await service.sendMail({
        to: 'user@example.com',
        subject: assunto,
        html: '<p>oi</p>',
      });

      const enviado = mockSendMail.mock.calls[0][0];
      expect(enviado.subject).not.toMatch(/[\r\n]/);
      expect(enviado.subject).toContain('linha1 linha2 linha3');
      expect(enviado.subject.length).toBeLessThanOrEqual(200);
    });
  });

  describe('remetente', () => {
    it('deve usar SMTP_FROM como remetente', async () => {
      const service = buildService();

      await service.sendEmailVerification('user@example.com', 't');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@example.com' }),
      );
    });

    it('deve usar remetente padrão quando SMTP_FROM não configurado', async () => {
      const service = buildService({ SMTP_FROM: undefined as unknown as string });

      await service.sendEmailVerification('user@example.com', 't');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@yourapp.com' }),
      );
    });
  });
});

import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from '../email.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

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

// sendMail must propagate transporter errors instead of returning false because callers in auth handle failure via try/catch.

describe('EmailService (shared)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  describe('Transporter setup', () => {
    it('should create the transport with mandatory TLS and ConfigService values', () => {
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

    it('should use secure=true when the port is 465', () => {
      buildService({ SMTP_PORT: 465 });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465, secure: true }),
      );
    });

    it('should use the default port 587 when not configured', () => {
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

    it('should THROW in production when SMTP credentials are missing', () => {
      const PREVIOUS_NODE_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => buildService({ SMTP_PASS: undefined as unknown as string })).toThrow(
          /SMTP não configurado/,
        );
      } finally {
        process.env.NODE_ENV = PREVIOUS_NODE_ENV;
      }
    });

    it('should only warn and continue outside production without credentials', () => {
      expect(() =>
        buildService({ SMTP_PASS: undefined as unknown as string }),
      ).not.toThrow();
    });
  });

  describe('sendEmailVerification()', () => {
    it('should send with recipient, subject and verification URL', async () => {
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

    it('should return true on success', async () => {
      const service = buildService();

      await expect(
        service.sendEmailVerification('user@example.com', 'token-123'),
      ).resolves.toBe(true);
    });

    it('should encode the token in the verification URL', async () => {
      const service = buildService();

      await service.sendEmailVerification('user@example.com', 'a+b/c=d?e&f');

      const body = mockSendMail.mock.calls[0][0].html as string;
      expect(body).toContain(encodeURIComponent('a+b/c=d?e&f'));
      expect(body).not.toContain('a+b/c=d?e&f');
    });

    it('should PROPAGATE the transporter error instead of returning false', async () => {
      const service = buildService();
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

      await expect(
        service.sendEmailVerification('user@example.com', 'token-123'),
      ).rejects.toThrow('SMTP connection refused');
    });
  });

  describe('sendPasswordReset()', () => {
    it('should send with recipient, subject and reset URL', async () => {
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

    it('should return true on success', async () => {
      const service = buildService();

      await expect(
        service.sendPasswordReset('user@example.com', 'reset-456'),
      ).resolves.toBe(true);
    });

    it('should PROPAGATE the transporter error instead of returning false', async () => {
      const service = buildService();
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

      await expect(
        service.sendPasswordReset('user@example.com', 'reset-456'),
      ).rejects.toThrow('SMTP timeout');
    });
  });

  describe('sink hardening (to/subject)', () => {
    it('should reject recipient with CRLF (header injection)', async () => {
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

    it('should reject recipient with invalid format or multiple addresses', async () => {
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

    it('should flatten CRLF and truncate the subject to 200 characters', async () => {
      const service = buildService();
      const subject = 'linha1\r\nlinha2\nlinha3' + 'x'.repeat(300);

      await service.sendMail({
        to: 'user@example.com',
        subject,
        html: '<p>oi</p>',
      });

      const sent = mockSendMail.mock.calls[0][0];
      expect(sent.subject).not.toMatch(/[\r\n]/);
      expect(sent.subject).toContain('linha1 linha2 linha3');
      expect(sent.subject.length).toBeLessThanOrEqual(200);
    });
  });

  describe('sender', () => {
    it('should use SMTP_FROM as sender', async () => {
      const service = buildService();

      await service.sendEmailVerification('user@example.com', 't');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@example.com' }),
      );
    });

    it('should use default sender when SMTP_FROM is not configured', async () => {
      const service = buildService({ SMTP_FROM: undefined as unknown as string });

      await service.sendEmailVerification('user@example.com', 't');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@yourapp.com' }),
      );
    });
  });
});

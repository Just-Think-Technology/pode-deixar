import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import createLogger from '@pode-deixar/logger';
import { verificationTemplate, passwordResetTemplate } from './email.templates';

const logger = createLogger('email');

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      const mensagem = 'SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS ausentes)';
      // Em produção, falhar no boot em vez de operar sem envio de email.
      if (process.env.NODE_ENV === 'production') {
        logger.error('email.setup', mensagem);
        throw new Error(mensagem);
      }
      logger.warn('email.setup', 'SMTP not fully configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      auth: { user, pass },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    const from = options.from || this.configService.get<string>('SMTP_FROM') || 'noreply@yourapp.com';
    // Valida destinatário único (rejeita injeção de cabeçalho via CRLF).
    this.validarDestinatario(options.to);
    // Neutraliza CRLF no assunto e limita a 200 caracteres (header injection).
    const subject = options.subject.replace(/[\r\n]+/g, ' ').slice(0, 200);

    try {
      await this.transporter.sendMail({ from, to: options.to, subject, html: options.html });
      logger.info('email.send', `Email sent to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('email.send', `Failed to send email to ${options.to} - ${error.message}`);
      throw error;
    }
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${encodeURIComponent(token)}`;

    return this.sendMail({
      to: email,
      subject: 'Verifique seu endereço de email',
      html: verificationTemplate(verificationUrl),
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${encodeURIComponent(token)}`;

    return this.sendMail({
      to: email,
      subject: 'Redefina sua senha',
      html: passwordResetTemplate(resetUrl),
    });
  }

  private validarDestinatario(to: string): void {
    // Aceita um único endereço RFC-5322 aproximado; rejeita CRLF/endereços múltiplos.
    const formato = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof to !== 'string' || /[\r\n]/.test(to) || !formato.test(to)) {
      throw new Error('Endereço de email destinatário inválido');
    }
  }
}

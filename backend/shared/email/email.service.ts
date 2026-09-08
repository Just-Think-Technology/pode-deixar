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
      const message = 'SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS ausentes)';
      // Fail the boot in production instead of running without email delivery.
      if (process.env.NODE_ENV === 'production') {
        logger.error('email.setup', message);
        throw new Error(message);
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
    this.validateRecipient(options.to);
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

  private validateRecipient(to: string): void {
    // Linear-time checks instead of a nested pattern, which backtracks polynomially on hostile input (CodeQL: polynomial ReDoS).
    if (typeof to !== 'string' || /[\r\n]/.test(to)) {
      throw new Error('Endereço de email destinatário inválido');
    }
    const atIndex = to.indexOf('@');
    if (atIndex <= 0 || atIndex !== to.lastIndexOf('@') || atIndex === to.length - 1) {
      throw new Error('Endereço de email destinatário inválido');
    }
    const domain = to.slice(atIndex + 1);
    if (
      /\s/.test(to) ||
      !domain.includes('.') ||
      domain.startsWith('.') ||
      domain.endsWith('.')
    ) {
      throw new Error('Endereço de email destinatário inválido');
    }
  }
}

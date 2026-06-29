import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import createLogger from '@pode-deixar/logger';

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
      logger.warn('email.setup', 'SMTP not fully configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
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

    try {
      await this.transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html });
      logger.info('email.send', `Email sent to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('email.send', `Failed to send email to ${options.to} - ${error.message}`);
      throw error;
    }
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${token}`;

    return this.sendMail({
      to: email,
      subject: 'Verifique seu endereço de email',
      html: `
        <h1>Bem-vindo!</h1>
        <p>Por favor, verifique seu endereço de email clicando no link abaixo:</p>
        <a href="${verificationUrl}">Verificar Email</a>
        <p>Este link expirará em 24 horas.</p>
        <p>Se você não criou uma conta, ignore este email.</p>
      `,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    return this.sendMail({
      to: email,
      subject: 'Redefina sua senha',
      html: `
        <h1>Solicitação de redefinição de senha</h1>
        <p>Você solicitou a redefinição de senha. Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}">Redefinir Senha</a>
        <p>Este link expirará em 1 hora.</p>
        <p>Se você não solicitou isso, ignore este email.</p>
      `,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import getLogger from '../shared/shared-logger';

const logger = getLogger('email');

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      logger.warn(
        'auth.email',
        'SMTP not fully configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendEmailVerification(email: string, token: string) {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || 'noreply@yourapp.com',
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
      logger.info('auth.email', `Verification email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('auth.email', `Failed to send verification email to ${email} - ${error.message}`);
      throw error;
    }
  }

  async sendPasswordReset(email: string, token: string) {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || 'noreply@yourapp.com',
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
      logger.info('auth.email', `Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('auth.email', `Failed to send password reset email to ${email} - ${error.message}`);
      throw error;
    }
  }
}

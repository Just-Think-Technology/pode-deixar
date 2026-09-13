import { Injectable, BadRequestException } from '@nestjs/common';
import { RegisterRepository } from './register.repository';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from '../password/password.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Identical response for new and existing emails to prevent an account-enumeration oracle (CWE-204).
const SIGNUP_RESPONSE_MESSAGE =
  'Usuário cadastrado com sucesso. Verifique seu email para ativar sua conta.';

@Injectable()
export class RegisterService {
  constructor(
    private repository: RegisterRepository,
    private authLogger: AuthLoggerService,
    private emailService: EmailService,
    private passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto, ip?: string) {
    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException('Senhas não conferem');
    }

    const existingUser = await this.repository.findUserByEmail(dto.email);
    // Existing email: same response as a new signup; unverified accounts get a rotated token and a best-effort resend without revealing anything.
    if (existingUser) {
      if (!existingUser.emailVerified) {
        const emailVerificationToken = uuidv4();
        const emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        );
        await this.repository.updateVerificationToken(
          existingUser.id,
          this.hashToken(emailVerificationToken),
          emailVerificationExpires,
        );
        try {
          await this.emailService.sendEmailVerification(
            dto.email,
            emailVerificationToken,
          );
        } catch (error) {
          this.authLogger.logSecurityEvent('email_send_failed', {
            email: dto.email,
            type: 'verification',
            error: error.message,
          });
        }
      }
      this.authLogger.logSecurityEvent('register_existing_email', {
        email: dto.email,
      });
      return { message: SIGNUP_RESPONSE_MESSAGE };
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    // Only the hash is stored; the raw token travels by email (and non-prod echo) only.
    const emailVerificationToken = uuidv4();
    const emailVerificationTokenHash = this.hashToken(emailVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [user] = await this.repository.createUserWithProfile({
      completeName: dto.complete_name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      phone: dto.phone,
      postalCode: dto.postal_code,
      emailVerificationTokenHash,
      emailVerificationExpires,
    });

    try {
      await this.emailService.sendEmailVerification(
        dto.email,
        emailVerificationToken,
      );
    } catch (error) {
      this.authLogger.logSecurityEvent('email_send_failed', {
        email: dto.email,
        type: 'verification',
        error: error.message,
      });
    }

    this.authLogger.logRegistration(dto.email, dto.role, ip);

    return {
      message: SIGNUP_RESPONSE_MESSAGE,
      user: {
        id: user.id,
        complete_name: user.completeName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        postal_code: user.postalCode,
        email_verified: user.emailVerified,
        created_at: user.createdAt,
      },
      ...(process.env.NODE_ENV !== 'production' && {
        email_verification_token: emailVerificationToken,
      }),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.repository.findUserByVerificationTokenHash(
      this.hashToken(dto.token),
    );
    if (!user) {
      this.authLogger.logEmailVerificationTokenFailure(
        dto.token,
        'invalid token',
      );
      throw new BadRequestException('Token de verificação inválido');
    }
    if (user.emailVerified) {
      this.authLogger.logEmailVerification(
        user.email,
        false,
        'already verified',
      );
      throw new BadRequestException('Email já verificado');
    }
    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      this.authLogger.logEmailVerification(user.email, false, 'token expired');
      throw new BadRequestException(
        'Token de verificação expirou. Solicite um novo email de verificação.',
      );
    }

    await this.repository.markEmailVerified(user.id);
    this.authLogger.logEmailVerification(user.email, true);
    return { message: 'Email verificado com sucesso' };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) {
      this.authLogger.logResendVerification(dto.email, false);
      return {
        message: 'Se o email existir, um novo link de verificação foi enviado',
      };
    }
    if (user.emailVerified) {
      this.authLogger.logResendVerification(dto.email, false);
      // Generic anti-enumeration response for already-verified emails too.
      return {
        message: 'Se o email existir, um novo link de verificação foi enviado',
      };
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repository.updateVerificationToken(
      user.id,
      this.hashToken(emailVerificationToken),
      emailVerificationExpires,
    );

    try {
      await this.emailService.sendEmailVerification(
        dto.email,
        emailVerificationToken,
      );
      this.authLogger.logResendVerification(dto.email, true);
    } catch (error) {
      this.authLogger.logSecurityEvent('email_send_failed', {
        email: dto.email,
        type: 'verification',
        error: error.message,
      });
      this.authLogger.logResendVerification(dto.email, false);
    }

    return {
      message: 'Se o email existir, um novo link de verificação foi enviado',
      ...(process.env.NODE_ENV !== 'production' && {
        email_verification_token: emailVerificationToken,
      }),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

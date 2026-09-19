// Register service — signup with email verification

import { Injectable, BadRequestException } from '@nestjs/common';
import { User } from '@prisma/client';
import { RegisterRepository } from './register.repository';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from '../password/password.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const SIGNUP_RESPONSE_MESSAGE =
  'Usuário cadastrado com sucesso. Verifique seu email para ativar sua conta.';
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RegisterService {
  constructor(
    private repository: RegisterRepository,
    private authLogger: AuthLoggerService,
    private emailService: EmailService,
    private passwordService: PasswordService,
  ) {}

  // --- Public API ---

  /**
   * Registers a new user and sends the verification email.
   * Existing emails get the identical response so callers cannot probe
   * for registered accounts (anti-enumeration).
   */
  async register(dto: RegisterDto, ip?: string) {
    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException('Senhas não conferem');
    }

    const existingUser = await this.repository.findUserByEmail(dto.email);
    if (existingUser) {
      return this.handleExistingUser(existingUser, dto.email);
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    // Only hash is stored; raw token travels by email (non-prod echo only).
    const emailVerificationToken = uuidv4();
    const user = await this.createUserWithProfile(dto, {
      passwordHash,
      emailVerificationTokenHash: this.hashToken(emailVerificationToken),
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    });

    await this.sendVerificationEmail(dto.email, emailVerificationToken);
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
      ...this.devOnlyVerificationToken(emailVerificationToken),
    };
  }

  // same response for existing email prevents account-enumeration oracle
  private async handleExistingUser(existingUser: User, email: string) {
    if (!existingUser.emailVerified) {
      const emailVerificationToken = await this.rotateVerificationToken(
        existingUser.id,
      );
      await this.sendVerificationEmail(email, emailVerificationToken);
    }
    this.authLogger.logSecurityEvent('register_existing_email', { email });
    return { message: SIGNUP_RESPONSE_MESSAGE };
  }

  private async createUserWithProfile(
    dto: RegisterDto,
    credentials: {
      passwordHash: string;
      emailVerificationTokenHash: string;
      emailVerificationExpires: Date;
    },
  ) {
    const [user] = await this.repository.createUserWithProfile({
      completeName: dto.complete_name,
      email: dto.email,
      passwordHash: credentials.passwordHash,
      role: dto.role,
      phone: dto.phone,
      postalCode: dto.postal_code,
      emailVerificationTokenHash: credentials.emailVerificationTokenHash,
      emailVerificationExpires: credentials.emailVerificationExpires,
    });
    return user;
  }

  private async rotateVerificationToken(userId: string): Promise<string> {
    const emailVerificationToken = uuidv4();
    await this.repository.updateVerificationToken(userId, this.hashToken(emailVerificationToken), new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS));
    return emailVerificationToken;
  }

  private async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<void> {
    await this.trySendVerificationEmail(email, token);
  }

  private devOnlyVerificationToken(token: string) {
    return (
      process.env.NODE_ENV !== 'production' && {
        email_verification_token: token,
      }
    );
  }

  /**
   * Confirms a user's email from a verification token.
   * Rejects unknown, already-used, and expired tokens with distinct messages.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.repository.findUserByVerificationTokenHash(this.hashToken(dto.token));
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

  /**
   * Resends the verification email, rotating the token.
   * Unknown and already-verified emails get the identical generic response
   * so callers cannot probe for registered accounts (anti-enumeration).
   */
  async resendVerificationEmail(dto: ResendVerificationDto) {
    // Generic anti-enumeration response for unknown and verified emails.
    const genericResponse = () => ({
      message: 'Se o email existir, um novo link de verificação foi enviado',
    });

    const user = await this.repository.findUserByEmail(dto.email);
    if (!user || user.emailVerified) {
      this.authLogger.logResendVerification(dto.email, false);
      return genericResponse();
    }

    const emailVerificationToken = await this.rotateVerificationToken(user.id);
    const sent = await this.trySendVerificationEmail(
      dto.email,
      emailVerificationToken,
    );
    this.authLogger.logResendVerification(dto.email, sent);

    return {
      ...genericResponse(),
      ...this.devOnlyVerificationToken(emailVerificationToken),
    };
  }

  private async trySendVerificationEmail(
    email: string,
    token: string,
  ): Promise<boolean> {
    try {
      await this.emailService.sendEmailVerification(email, token);
      return true;
    } catch (error) {
      this.authLogger.logSecurityEvent('email_send_failed', {
        email,
        type: 'verification',
        error: error.message,
      });
      return false;
    }
  }

  // --- Private Helpers ---

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

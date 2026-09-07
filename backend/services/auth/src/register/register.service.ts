import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from '../password/password.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Resposta única do cadastro (conta nova ou email já existente): impede
// oráculo de enumeração de contas (CWE-204). O chamador não distingue os casos.
const MENSAGEM_CADASTRO =
  'Usuário cadastrado com sucesso. Verifique seu email para ativar sua conta.';

@Injectable()
export class RegisterService {
  constructor(
    private prisma: PrismaService,
    private authLogger: AuthLoggerService,
    private emailService: EmailService,
    private passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto, ip?: string) {
    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException('Senhas não conferem');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Email já cadastrado: responde igual ao cadastro novo (sem oráculo).
    // Se ainda não verificado, renova o token (hash, como no cadastro) e
    // reenvia o email best-effort (silencioso) — sem revelar nada ao chamador.
    if (existingUser) {
      if (!existingUser.emailVerified) {
        const emailVerificationToken = uuidv4();
        const emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        );
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerificationToken: this.hashToken(emailVerificationToken),
            emailVerificationExpires,
          },
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
      }
      this.authLogger.logSecurityEvent('register_existing_email', {
        email: dto.email,
      });
      return { message: MENSAGEM_CADASTRO };
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    // Token bruto circula apenas por email/eco não-prod; no banco fica o hash.
    const emailVerificationToken = uuidv4();
    const emailVerificationTokenHash = this.hashToken(emailVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [user] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          completeName: dto.complete_name,
          email: dto.email,
          password: passwordHash,
          role: dto.role,
          phone: dto.phone,
          postalCode: dto.postal_code,
          emailVerificationToken: emailVerificationTokenHash,
          emailVerificationExpires,
        },
        select: {
          id: true,
          completeName: true,
          email: true,
          role: true,
          phone: true,
          postalCode: true,
          emailVerified: true,
          createdAt: true,
          emailVerificationToken: true,
        },
      });

      if (dto.role === 'CLIENT') {
        await tx.clientProfile.create({
          data: { userId: user.id, preferences: {} },
        });
      } else if (dto.role === 'PROVIDER') {
        await tx.providerProfile.create({
          data: {
            userId: user.id,
            skills: [],
            portfolio: [],
            isAvailable: true,
          },
        });
      }

      return [user];
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
      // Email failure não bloqueia cadastro — avisa para conferir spam
    }

    this.authLogger.logRegistration(dto.email, dto.role, ip);

    return {
      message: MENSAGEM_CADASTRO,
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
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: this.hashToken(dto.token) },
    });
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    this.authLogger.logEmailVerification(user.email, true);
    return { message: 'Email verificado com sucesso' };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.authLogger.logResendVerification(dto.email, false);
      return {
        message: 'Se o email existir, um novo link de verificação foi enviado',
      };
    }
    if (user.emailVerified) {
      this.authLogger.logResendVerification(dto.email, false);
      // Resposta genérica anti-enumeração também para email já verificado.
      return {
        message: 'Se o email existir, um novo link de verificação foi enviado',
      };
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: this.hashToken(emailVerificationToken),
        emailVerificationExpires,
      },
    });

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

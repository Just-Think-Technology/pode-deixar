import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '../send_email/email.service';
import { PasswordService } from '../password/password.service';
import { v4 as uuidv4 } from 'uuid';

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
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        completeName: dto.complete_name,
        email: dto.email,
        password: passwordHash,
        role: dto.role,
        phone: dto.phone,
        postalCode: dto.postal_code,
        emailVerificationToken,
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
      },
    });

    try {
      await this.emailService.sendEmailVerification(dto.email, emailVerificationToken);
    } catch (error) {
      this.authLogger.logSecurityEvent('email_send_failed', {
        email: dto.email,
        type: 'verification',
        error: error.message,
      });
    }

    this.authLogger.logRegistration(dto.email, dto.role, ip);

    return {
      message: 'User registered successfully. Please check your email to verify your account.',
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
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({ where: { emailVerificationToken: dto.token } });
    if (!user) {
      this.authLogger.logEmailVerificationTokenFailure(dto.token, 'invalid token');
      throw new BadRequestException('Invalid verification token');
    }
    if (user.emailVerified) {
      this.authLogger.logEmailVerification(user.email, false, 'already verified');
      throw new BadRequestException('Email already verified');
    }
    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      this.authLogger.logEmailVerification(user.email, false, 'token expired');
      throw new BadRequestException('Verification token has expired. Please request a new verification email.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpires: null } });
    this.authLogger.logEmailVerification(user.email, true);
    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      this.authLogger.logResendVerification(dto.email, false);
      return { message: 'If the email exists, a new verification link has been sent' };
    }
    if (user.emailVerified) {
      this.authLogger.logResendVerification(dto.email, false);
      throw new BadRequestException('Email is already verified');
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken, emailVerificationExpires } });

    try {
      await this.emailService.sendEmailVerification(dto.email, emailVerificationToken);
      this.authLogger.logResendVerification(dto.email, true);
    } catch (error) {
      this.authLogger.logSecurityEvent('email_send_failed', { email: dto.email, type: 'verification', error: error.message });
      this.authLogger.logResendVerification(dto.email, false);
    }

    return { message: 'If the email exists, a new verification link has been sent' };
  }
}

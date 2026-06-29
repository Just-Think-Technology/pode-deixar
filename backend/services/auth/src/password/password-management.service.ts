import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from './password.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PasswordManagementService {
  constructor(
    private prisma: PrismaService,
    private authLogger: AuthLoggerService,
    private emailService: EmailService,
    private passwordService: PasswordService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.authLogger.logPasswordResetRequested(dto.email, false);
      return {
        message:
          'Se o email existir, um link de redefinição de senha foi enviado',
      };
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: expiresAt },
    });

    try {
      await this.emailService.sendPasswordReset(dto.email, resetToken);
      this.authLogger.logPasswordResetRequested(dto.email, true);
      this.authLogger.logPasswordReset(dto.email, true);
    } catch {
      this.authLogger.logPasswordResetRequested(dto.email, false);
      this.authLogger.logPasswordReset(dto.email, false);
    }

    return {
      message:
        'Se o email existir, um link de redefinição de senha foi enviado',
      ...(process.env.NODE_ENV !== 'production' && {
        reset_password_token: resetToken,
      }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gt: new Date() },
      },
    });
    if (!user) {
      this.authLogger.logSecurityEvent('password_reset_invalid_token', {
        token: dto.token,
      });
      throw new BadRequestException(
        'Token de redefinição inválido ou expirado',
      );
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
    this.authLogger.logPasswordResetComplete(user.email);

    return {
      message: 'Senha redefinida com sucesso',
      user: {
        email: user.email,
        role: user.role,
      },
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    accessTokenJti?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.authLogger.logSecurityEvent('password_change_invalid_user', {
        userId,
      });
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const isCurrentPasswordValid = await this.passwordService.verify(
      user.password,
      dto.currentPassword,
    );
    if (!isCurrentPasswordValid) {
      this.authLogger.logPasswordChange(userId, false);
      throw new BadRequestException('Senha atual incorreta');
    }

    const hashedNewPassword = await this.passwordService.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword, refreshToken: null },
    });
    this.authLogger.logPasswordChange(userId, true);

    try {
      if (accessTokenJti) {
        await this.prisma.tokenBlacklist.create({
          data: {
            jti: accessTokenJti,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
      ) {
        this.authLogger.logSecurityEvent('token_blacklist_table_missing', {
          userId,
          message:
            'token_blacklist table missing, password changed but access token not blacklisted',
        });
      } else {
        throw error;
      }
    }

    return { message: 'Senha alterada com sucesso' };
  }
}

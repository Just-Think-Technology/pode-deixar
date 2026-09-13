import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PasswordManagementRepository } from './password-management.repository';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '@pode-deixar/email';
import { PasswordService } from './password.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class PasswordManagementService {
  constructor(
    private repository: PasswordManagementRepository,
    private authLogger: AuthLoggerService,
    private emailService: EmailService,
    private passwordService: PasswordService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) {
      this.authLogger.logPasswordResetRequested(dto.email, false);
      return {
        message:
          'Se o email existir, um link de redefinição de senha foi enviado',
      };
    }

    // Only the hash is stored; the raw token travels by email (and non-prod echo) only.
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.repository.storePasswordResetToken(
      user.id,
      this.hashToken(resetToken),
      expiresAt,
    );

    try {
      await this.emailService.sendPasswordReset(dto.email, resetToken);
      this.authLogger.logPasswordResetRequested(dto.email, true);
      this.authLogger.logPasswordReset(dto.email, true);
    } catch (error) {
      this.authLogger.logPasswordResetRequested(dto.email, false);
      this.authLogger.logPasswordReset(dto.email, false);
      this.authLogger.logSecurityEvent('email_send_failed', {
        email: dto.email,
        type: 'password_reset',
        error: error.message,
      });
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
    const user = await this.repository.findUserByValidResetToken(
      this.hashToken(dto.token),
    );
    if (!user) {
      this.authLogger.logSecurityEvent('password_reset_invalid_token', {
        token_suffix: dto.token.slice(-4),
      });
      throw new BadRequestException(
        'Token de redefinição inválido ou expirado',
      );
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);

    await this.repository.completePasswordReset(user.id, hashedPassword);
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
    const user = await this.repository.findUserById(userId);
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
    await this.repository.updatePasswordAndClearRefresh(
      userId,
      hashedNewPassword,
    );
    this.authLogger.logPasswordChange(userId, true);

    try {
      if (accessTokenJti) {
        await this.repository.blacklistToken(
          accessTokenJti,
          new Date(Date.now() + 15 * 60 * 1000),
        );
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

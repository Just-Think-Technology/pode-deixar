import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '../send_email/email.service';
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
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      this.authLogger.logPasswordResetRequested(dto.email, false);
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: resetToken, passwordResetExpires: expiresAt } });

    try {
      await this.emailService.sendPasswordReset(dto.email, resetToken);
      this.authLogger.logPasswordResetRequested(dto.email, true);
      this.authLogger.logPasswordReset(dto.email, true);
    } catch (error) {
      this.authLogger.logPasswordResetRequested(dto.email, false);
      this.authLogger.logPasswordReset(dto.email, false);
    }

    return {
      message: 'If the email exists, a password reset link has been sent',
      ...(process.env.NODE_ENV !== 'production' && {
        reset_password_token: resetToken,
      }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { passwordResetToken: dto.token, passwordResetExpires: { gt: new Date() } } });
    if (!user) {
      this.authLogger.logSecurityEvent('password_reset_invalid_token', { token: dto.token });
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);

    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null, failedLoginAttempts: 0, lockoutUntil: null } });
    this.authLogger.logPasswordResetComplete(user.email);

    return {
      message: 'Password reset successfully',
      user: {
        email: user.email,
        role: user.role,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.authLogger.logSecurityEvent('password_change_invalid_user', { userId });
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await this.passwordService.verify(user.password, dto.currentPassword);
    if (!isCurrentPasswordValid) {
      this.authLogger.logPasswordChange(userId, false);
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await this.passwordService.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashedNewPassword } });
    this.authLogger.logPasswordChange(userId, true);

    return { message: 'Password changed successfully' };
  }
}

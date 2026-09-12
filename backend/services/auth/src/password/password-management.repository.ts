import { Injectable } from '@nestjs/common';
import { PrismaService } from '@pode-deixar/prisma';

@Injectable()
export class PasswordManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  storePasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      },
    });
  }

  findUserByValidResetToken(tokenHash: string) {
    return this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });
  }

  completePasswordReset(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  updatePasswordAndClearRefresh(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, refreshToken: null },
    });
  }

  blacklistToken(jti: string, expiresAt: Date) {
    return this.prisma.tokenBlacklist.create({
      data: {
        jti,
        expiresAt,
      },
    });
  }
}

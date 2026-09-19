import { Injectable } from '@nestjs/common';
import { PrismaService } from '@pode-deixar/prisma';

@Injectable()
export class LoginRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  lockAccount(userId: string, attempts: number, lockoutUntil: Date) {
    return this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockoutUntil,
      },
    });
  }

  incrementFailedAttempts(userId: string, attempts: number) {
    return this.prisma.user.updateMany({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  }

  resetLoginState(userId: string) {
    return this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  storeRefreshTokenHash(userId: string, hashedToken: string) {
    return this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        refreshToken: hashedToken,
      },
    });
  }

  findUserByIdAndRefreshToken(userId: string, hashedToken: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, refreshToken: hashedToken },
    });
  }

  clearRefreshTokenByUserId(userId: string) {
    return this.prisma.user.updateMany({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  clearRefreshToken(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  storeNewRefreshToken(userId: string, hashedToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  findUserEmailById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
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

  pruneExpiredTokens() {
    return this.prisma.tokenBlacklist.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  updateVerificationHint(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: expiresAt,
      },
    });
  }
}

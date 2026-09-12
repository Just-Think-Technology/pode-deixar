import { Injectable } from '@nestjs/common';
import { PrismaService } from '@pode-deixar/prisma';

@Injectable()
export class VerifyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBlacklistedToken(jti: string) {
    return this.prisma.tokenBlacklist.findUnique({
      where: { jti },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        completeName: true,
        email: true,
        role: true,
      },
    });
  }
}

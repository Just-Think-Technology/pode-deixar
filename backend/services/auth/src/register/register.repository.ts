import { Injectable } from '@nestjs/common';
import { PrismaService } from '@pode-deixar/prisma';
import { Prisma, Role } from '@prisma/client';

export interface CreateUserWithProfileData {
  completeName: string;
  email: string;
  passwordHash: string;
  role: string;
  phone: string;
  postalCode: string;
  emailVerificationTokenHash: string;
  emailVerificationExpires: Date;
}

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class RegisterRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  updateVerificationToken(userId: string, tokenHash: string, expires: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: expires,
      },
    });
  }

  createUserWithProfile(data: CreateUserWithProfileData) {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const user = await tx.user.create({
        data: {
          completeName: data.completeName,
          email: data.email,
          password: data.passwordHash,
          role: data.role as Role,
          phone: data.phone,
          postalCode: data.postalCode,
          emailVerificationToken: data.emailVerificationTokenHash,
          emailVerificationExpires: data.emailVerificationExpires,
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

      if (data.role === 'CLIENT') {
        await tx.clientProfile.create({
          data: { userId: user.id, preferences: {} },
        });
      } else if (data.role === 'PROVIDER') {
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
  }

  findUserByVerificationTokenHash(tokenHash: string) {
    return this.prisma.user.findFirst({
      where: { emailVerificationToken: tokenHash },
    });
  }

  markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

export interface CreateClientProfileData {
  userId: string;
  avatarUrl?: string | null;
  preferences: any;
}

export interface UpdateClientProfileData {
  avatarUrl: string | null;
  preferences: any;
}

export interface CreateProviderProfileData {
  userId: string;
  avatarUrl?: string | null;
  bio?: string | null;
  hourlyRate?: any;
  skills: string[];
  portfolio: any;
  isAvailable: boolean;
}

export interface UpdateProviderProfileData {
  avatarUrl: string | null;
  bio: string | null;
  hourlyRate: any;
  skills: any;
  portfolio: any;
  isAvailable: boolean;
}

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        completeName: true,
        email: true,
        phone: true,
        postalCode: true,
        role: true,
      },
    });
  }

  findClientProfileByUserId(userId: string) {
    return this.prisma.clientProfile.findUnique({ where: { userId } });
  }

  findProviderProfileByUserId(userId: string) {
    return this.prisma.providerProfile.findUnique({ where: { userId } });
  }

  createClientProfile(data: CreateClientProfileData) {
    return this.prisma.clientProfile.create({ data });
  }

  updateClientProfile(userId: string, data: UpdateClientProfileData) {
    return this.prisma.clientProfile.update({ where: { userId }, data });
  }

  createProviderProfile(data: CreateProviderProfileData) {
    return this.prisma.providerProfile.create({ data });
  }

  updateProviderProfile(userId: string, data: UpdateProviderProfileData) {
    return this.prisma.providerProfile.update({ where: { userId }, data });
  }

  updateClientAvatar(userId: string, avatarUrl: string) {
    return this.prisma.clientProfile.update({
      where: { userId },
      data: { avatarUrl },
    });
  }

  updateProviderAvatar(userId: string, avatarUrl: string) {
    return this.prisma.providerProfile.update({
      where: { userId },
      data: { avatarUrl },
    });
  }

  findPublicProviderProfile(providerProfileId: string) {
    return this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }
}

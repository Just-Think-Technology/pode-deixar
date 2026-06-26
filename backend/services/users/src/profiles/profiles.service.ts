import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateClientProfileDto } from "./dto/create-client-profile.dto";
import { UpdateClientProfileDto } from "./dto/update-client-profile.dto";
import { CreateProviderProfileDto } from "./dto/create-provider-profile.dto";
import { UpdateProviderProfileDto } from "./dto/update-provider-profile.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private usersLogger: UsersLoggerService,
  ) {}

  async getProfile(userId: string, role: string) {
    if (role === "PROVIDER") {
      const profile = await this.prisma.providerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              completeName: true,
              email: true,
              phone: true,
              postalCode: true,
              role: true,
            },
          },
        },
      });
      if (!profile) {
        throw new NotFoundException("Provider profile not found");
      }
      this.usersLogger.logProfileFetched(userId, role);
      return this.formatProviderProfile(profile);
    }

    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
            role: true,
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException("Client profile not found");
    }
    this.usersLogger.logProfileFetched(userId, role);
    return this.formatClientProfile(profile);
  }

  async createClientProfile(
    userId: string,
    dto: CreateClientProfileDto,
    ip?: string,
  ) {
    const existing = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException("Client profile already exists");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "CLIENT") {
      throw new BadRequestException(
        "User must be a client to create client profile",
      );
    }

    const profile = await this.prisma.clientProfile.create({
      data: {
        userId,
        avatarUrl: dto.avatarUrl,
        preferences: dto.preferences || {},
      },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
            role: true,
          },
        },
      },
    });

    this.usersLogger.logProfileCreated(userId, "CLIENT", ip);
    return this.formatClientProfile(profile);
  }

  async updateClientProfile(
    userId: string,
    dto: UpdateClientProfileDto,
    ip?: string,
  ) {
    const existing = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException("Client profile not found");
    }

    const profile = await this.prisma.clientProfile.update({
      where: { userId },
      data: {
        avatarUrl: dto.avatarUrl ?? existing.avatarUrl,
        preferences:
          dto.preferences !== undefined
            ? dto.preferences
            : existing.preferences === null
              ? Prisma.JsonNull
              : existing.preferences,
      },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
            role: true,
          },
        },
      },
    });

    this.usersLogger.logProfileUpdated(userId, "CLIENT", ip);
    return this.formatClientProfile(profile);
  }

  async createProviderProfile(
    userId: string,
    dto: CreateProviderProfileDto,
    ip?: string,
  ) {
    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException("Provider profile already exists");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "PROVIDER") {
      throw new BadRequestException(
        "User must be a provider to create provider profile",
      );
    }

    const profile = await this.prisma.providerProfile.create({
      data: {
        userId,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        hourlyRate: dto.hourlyRate,
        skills: dto.skills || [],
        portfolio: dto.portfolio || [],
        isAvailable: dto.isAvailable ?? true,
      },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
            role: true,
          },
        },
      },
    });

    this.usersLogger.logProfileCreated(userId, "PROVIDER", ip);
    return this.formatProviderProfile(profile);
  }

  async updateProviderProfile(
    userId: string,
    dto: UpdateProviderProfileDto,
    ip?: string,
  ) {
    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException("Provider profile not found");
    }

    const profile = await this.prisma.providerProfile.update({
      where: { userId },
      data: {
        avatarUrl: dto.avatarUrl ?? existing.avatarUrl,
        bio: dto.bio ?? existing.bio,
        hourlyRate: dto.hourlyRate ?? existing.hourlyRate,
        skills: dto.skills !== undefined ? dto.skills : existing.skills,
        portfolio:
          dto.portfolio !== undefined
            ? dto.portfolio
            : existing.portfolio === null
              ? Prisma.JsonNull
              : existing.portfolio,
        isAvailable: dto.isAvailable ?? existing.isAvailable,
      },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
            role: true,
          },
        },
      },
    });

    this.usersLogger.logProfileUpdated(userId, "PROVIDER", ip);
    return this.formatProviderProfile(profile);
  }

  async uploadAvatar(
    userId: string,
    role: string,
    avatarUrl: string,
    ip?: string,
  ) {
    if (role === "PROVIDER") {
      const profile = await this.prisma.providerProfile.update({
        where: { userId },
        data: { avatarUrl },
        include: {
          user: {
            select: {
              id: true,
              completeName: true,
              email: true,
              phone: true,
              postalCode: true,
              role: true,
            },
          },
        },
      });
      this.usersLogger.logAvatarUploaded(userId, role, ip);
      return this.formatProviderProfile(profile);
    }

    const profile = await this.prisma.clientProfile.update({
      where: { userId },
      data: { avatarUrl },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
            role: true,
          },
        },
      },
    });
    this.usersLogger.logAvatarUploaded(userId, role, ip);
    return this.formatClientProfile(profile);
  }

  private formatClientProfile(profile: any) {
    return {
      id: profile.id,
      user: profile.user,
      avatar_url: profile.avatarUrl,
      preferences: profile.preferences,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  private formatProviderProfile(profile: any) {
    return {
      id: profile.id,
      user: profile.user,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      hourly_rate: profile.hourlyRate,
      skills: profile.skills,
      portfolio: profile.portfolio,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }
}

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

  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
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
    return user;
  }

  private formatClientProfile(profile: any, user: any) {
    return {
      id: profile.id,
      user: {
        id: user.id,
        complete_name: user.completeName,
        email: user.email,
        phone: user.phone,
        postal_code: user.postalCode,
        role: user.role,
      },
      avatar_url: profile.avatarUrl,
      preferences: profile.preferences,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  private formatProviderProfile(profile: any, user: any) {
    return {
      id: profile.id,
      user: {
        id: user.id,
        complete_name: user.completeName,
        email: user.email,
        phone: user.phone,
        postal_code: user.postalCode,
        role: user.role,
      },
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

  async getProfile(userId: string, role: string) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    if (role === "PROVIDER") {
      const profile = await this.prisma.providerProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new NotFoundException("Perfil de prestador não encontrado");
      }
      this.usersLogger.logProfileFetched(userId, role);
      return this.formatProviderProfile(profile, user);
    }

    if (role === "CLIENT") {
      const profile = await this.prisma.clientProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new NotFoundException("Perfil de cliente não encontrado");
      }
      this.usersLogger.logProfileFetched(userId, role);
      return this.formatClientProfile(profile, user);
    }

    throw new BadRequestException("Função inválida");
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
      throw new ConflictException("Perfil de cliente já existe");
    }

    const user = await this.getUser(userId);
    if (!user || user.role !== "CLIENT") {
      throw new BadRequestException(
        "Usuário precisa ser cliente para criar perfil de cliente",
      );
    }

    const profile = await this.prisma.clientProfile.create({
      data: {
        userId,
        avatarUrl: dto.avatarUrl,
        preferences: dto.preferences || {},
      },
    });

    this.usersLogger.logProfileCreated(userId, "CLIENT", ip);
    return this.formatClientProfile(profile, user);
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
      throw new NotFoundException("Perfil de cliente não encontrado");
    }

    const user = await this.getUser(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
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
    });

    this.usersLogger.logProfileUpdated(userId, "CLIENT", ip);
    return this.formatClientProfile(profile, user);
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
      throw new ConflictException("Perfil de prestador já existe");
    }

    const user = await this.getUser(userId);
    if (!user || user.role !== "PROVIDER") {
      throw new BadRequestException(
        "Usuário precisa ser prestador para criar perfil de prestador",
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
    });

    this.usersLogger.logProfileCreated(userId, "PROVIDER", ip);
    return this.formatProviderProfile(profile, user);
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
      throw new NotFoundException("Perfil de prestador não encontrado");
    }

    const user = await this.getUser(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
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
    });

    this.usersLogger.logProfileUpdated(userId, "PROVIDER", ip);
    return this.formatProviderProfile(profile, user);
  }

  async uploadAvatar(
    userId: string,
    role: string,
    avatarUrl: string,
    ip?: string,
  ) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    if (role === "PROVIDER") {
      const existingProfile = await this.prisma.providerProfile.findUnique({
        where: { userId },
      });
      if (!existingProfile) {
        throw new NotFoundException("Perfil de prestador não encontrado");
      }

      const profile = await this.prisma.providerProfile.update({
        where: { userId },
        data: { avatarUrl },
      });
      this.usersLogger.logAvatarUploaded(userId, role, ip);
      return this.formatProviderProfile(profile, user);
    }

    if (role === "CLIENT") {
      const existingProfile = await this.prisma.clientProfile.findUnique({
        where: { userId },
      });
      if (!existingProfile) {
        throw new NotFoundException("Perfil de cliente não encontrado");
      }

      const profile = await this.prisma.clientProfile.update({
        where: { userId },
        data: { avatarUrl },
      });
      this.usersLogger.logAvatarUploaded(userId, role, ip);
      return this.formatClientProfile(profile, user);
    }

    throw new BadRequestException("Função inválida");
  }
}

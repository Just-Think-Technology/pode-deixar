// Profiles service — client and provider profile management

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { MinioService } from "../storage/minio.service";
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateClientProfileDto } from "./dto/create-client-profile.dto";
import { UpdateClientProfileDto } from "./dto/update-client-profile.dto";
import { CreateProviderProfileDto } from "./dto/create-provider-profile.dto";
import { UpdateProviderProfileDto } from "./dto/update-provider-profile.dto";
import {
  ClientProfile,
  Prisma,
  ProviderProfile,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { extname } from "path";
import { validarArquivoImagem } from "@pode-deixar/validation";

type ProfileUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    completeName: true;
    email: true;
    phone: true;
    postalCode: true;
    role: true;
  };
}>;

type ProfileRole = "PROVIDER" | "CLIENT";

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private usersLogger: UsersLoggerService,
  ) {}

  // --- Private Helpers ---

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

  private async findUserOrThrow(userId: string): Promise<ProfileUser> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }
    return user;
  }

  // Formats client profile response; excludes PII (email, phone, postalCode).
  private formatClientProfile(profile: ClientProfile, user: ProfileUser) {
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
      avatar_url: profile.avatarUrl ?? undefined,
      preferences: profile.preferences,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  // Formats provider profile response; excludes PII (email, phone, postalCode).
  private formatProviderProfile(profile: ProviderProfile, user: ProfileUser) {
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
      avatar_url: profile.avatarUrl ?? undefined,
      bio: profile.bio ?? undefined,
      hourly_rate: profile.hourlyRate ? Number(profile.hourlyRate) : undefined,
      skills: profile.skills,
      portfolio: profile.portfolio,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  // --- Public API ---

  async getProfile(userId: string, role: string) {
    const user = await this.findUserOrThrow(userId);

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

  /**
   * Replaces the avatar of a client or provider profile.
   * Validates the image, uploads the new file, drops the previous one
   * best-effort, and stores the new URL.
   */
  async uploadAvatar(
    userId: string,
    role: string,
    file: Express.Multer.File,
    ip?: string,
  ) {
    const user = await this.findUserOrThrow(userId);
    if (role !== "PROVIDER" && role !== "CLIENT") {
      throw new BadRequestException("Função inválida");
    }
    return this.replaceAvatar(user, role, file, ip);
  }

  private async replaceAvatar(
    user: ProfileUser,
    role: ProfileRole,
    file: Express.Multer.File,
    ip?: string,
  ) {
    const existingProfile = await this.findProfileOrThrow(user.id, role);
    const avatarUrl = await this.storeAvatar(file);
    await this.deletePreviousAvatar(existingProfile.avatarUrl);
    return this.saveAvatarUrl(user, role, avatarUrl, ip);
  }

  private async findProfileOrThrow(userId: string, role: ProfileRole) {
    if (role === "PROVIDER") {
      const profile = await this.prisma.providerProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        throw new NotFoundException("Perfil de prestador não encontrado");
      }
      return profile;
    }
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException("Perfil de cliente não encontrado");
    }
    return profile;
  }

  private async storeAvatar(file: Express.Multer.File): Promise<string> {
    validarArquivoImagem(file.originalname, file.buffer);
    const ext = extname(file.originalname).toLowerCase();
    return this.minio.uploadFile(
      `${randomUUID()}${ext}`,
      file.buffer,
      file.mimetype,
      this.minio.avatarBucket,
    );
  }

  private async deletePreviousAvatar(avatarUrl: string | null): Promise<void> {
    if (!avatarUrl) {
      return;
    }
    const oldFileName = this.minio.extractFileName(
      avatarUrl,
      this.minio.avatarBucket,
    );
    await this.minio.deleteFile(oldFileName, this.minio.avatarBucket).catch(
      () => {},
    );
  }

  private async saveAvatarUrl(
    user: ProfileUser,
    role: ProfileRole,
    avatarUrl: string,
    ip?: string,
  ) {
    if (role === "PROVIDER") {
      const profile = await this.prisma.providerProfile.update({
        where: { userId: user.id },
        data: { avatarUrl },
      });
      this.usersLogger.logAvatarUploaded(user.id, role, ip);
      return this.formatProviderProfile(profile, user);
    }
    const profile = await this.prisma.clientProfile.update({
      where: { userId: user.id },
      data: { avatarUrl },
    });
    this.usersLogger.logAvatarUploaded(user.id, role, ip);
    return this.formatClientProfile(profile, user);
  }

  // Returns a public profile view that never exposes PII (email, phone, postalCode).
  async getPublicProviderProfile(providerProfileId: string) {
    const profile = await this.findPublicProfileOrThrow(providerProfileId);
    return this.formatPublicProviderProfile(profile);
  }

  private async findPublicProfileOrThrow(providerProfileId: string) {
    // Public profile must never expose PII, so select only id and name.
    const profile = await this.prisma.providerProfile.findUnique({
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
    if (!profile) {
      throw new NotFoundException("Perfil de prestador não encontrado");
    }
    return profile;
  }

  private formatPublicProviderProfile(
    profile: Prisma.ProviderProfileGetPayload<{
      include: {
        user: { select: { id: true; completeName: true } };
        services: {
          where: { isActive: true };
          orderBy: { createdAt: "desc" };
          include: {
            category: { select: { id: true; name: true; slug: true } };
          };
        };
      };
    }>,
  ) {
    return {
      id: profile.id,
      user: {
        id: profile.user.id,
        complete_name: profile.user.completeName,
      },
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      hourly_rate: profile.hourlyRate ? Number(profile.hourlyRate) : undefined,
      skills: profile.skills,
      portfolio: profile.portfolio,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      services: profile.services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fixed_price: s.fixedPrice != null ? Number(s.fixedPrice) : s.fixedPrice,
        category_id: s.categoryId,
        category: s.category
          ? { id: s.category.id, name: s.category.name, slug: s.category.slug }
          : null,
      })),
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
<<<<<<< HEAD
import { MinioService } from "../storage/minio.service";
=======
>>>>>>> 68d7f77 (Develop (#13))
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateClientProfileDto } from "./dto/create-client-profile.dto";
import { UpdateClientProfileDto } from "./dto/update-client-profile.dto";
import { CreateProviderProfileDto } from "./dto/create-provider-profile.dto";
import { UpdateProviderProfileDto } from "./dto/update-provider-profile.dto";
import { Prisma } from "@prisma/client";
<<<<<<< HEAD
import { randomUUID } from "crypto";
import { extname } from "path";
=======
>>>>>>> 68d7f77 (Develop (#13))

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
<<<<<<< HEAD
    private minio: MinioService,
=======
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new NotFoundException("Usuário não encontrado");
=======
      throw new NotFoundException("User not found");
>>>>>>> 68d7f77 (Develop (#13))
    }

    if (role === "PROVIDER") {
      const profile = await this.prisma.providerProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
<<<<<<< HEAD
        throw new NotFoundException("Perfil de prestador não encontrado");
=======
        throw new NotFoundException("Provider profile not found");
>>>>>>> 68d7f77 (Develop (#13))
      }
      this.usersLogger.logProfileFetched(userId, role);
      return this.formatProviderProfile(profile, user);
    }

    if (role === "CLIENT") {
      const profile = await this.prisma.clientProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
<<<<<<< HEAD
        throw new NotFoundException("Perfil de cliente não encontrado");
=======
        throw new NotFoundException("Client profile not found");
>>>>>>> 68d7f77 (Develop (#13))
      }
      this.usersLogger.logProfileFetched(userId, role);
      return this.formatClientProfile(profile, user);
    }

<<<<<<< HEAD
    throw new BadRequestException("Função inválida");
=======
    throw new BadRequestException("Invalid role");
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new ConflictException("Perfil de cliente já existe");
=======
      throw new ConflictException("Client profile already exists");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const user = await this.getUser(userId);
    if (!user || user.role !== "CLIENT") {
      throw new BadRequestException(
<<<<<<< HEAD
        "Usuário precisa ser cliente para criar perfil de cliente",
=======
        "User must be a client to create client profile",
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new NotFoundException("Perfil de cliente não encontrado");
=======
      throw new NotFoundException("Client profile not found");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const user = await this.getUser(userId);
    if (!user) {
<<<<<<< HEAD
      throw new NotFoundException("Usuário não encontrado");
=======
      throw new NotFoundException("User not found");
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new ConflictException("Perfil de prestador já existe");
=======
      throw new ConflictException("Provider profile already exists");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const user = await this.getUser(userId);
    if (!user || user.role !== "PROVIDER") {
      throw new BadRequestException(
<<<<<<< HEAD
        "Usuário precisa ser prestador para criar perfil de prestador",
=======
        "User must be a provider to create provider profile",
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new NotFoundException("Perfil de prestador não encontrado");
=======
      throw new NotFoundException("Provider profile not found");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const user = await this.getUser(userId);
    if (!user) {
<<<<<<< HEAD
      throw new NotFoundException("Usuário não encontrado");
=======
      throw new NotFoundException("User not found");
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
    file: Express.Multer.File,
=======
    avatarUrl: string,
>>>>>>> 68d7f77 (Develop (#13))
    ip?: string,
  ) {
    const user = await this.getUser(userId);
    if (!user) {
<<<<<<< HEAD
      throw new NotFoundException("Usuário não encontrado");
    }

    const ext = extname(file.originalname);
    const fileName = `${randomUUID()}${ext}`;
    const url = await this.minio.uploadFile(
      fileName,
      file.buffer,
      file.mimetype,
      this.minio.avatarBucket,
    );

=======
      throw new NotFoundException("User not found");
    }

>>>>>>> 68d7f77 (Develop (#13))
    if (role === "PROVIDER") {
      const existingProfile = await this.prisma.providerProfile.findUnique({
        where: { userId },
      });
      if (!existingProfile) {
<<<<<<< HEAD
        throw new NotFoundException("Perfil de prestador não encontrado");
      }

      if (existingProfile.avatarUrl) {
        const oldFileName = this.minio.extractFileName(
          existingProfile.avatarUrl,
          this.minio.avatarBucket,
        );
        await this.minio
          .deleteFile(oldFileName, this.minio.avatarBucket)
          .catch(() => {});
=======
        throw new NotFoundException("Provider profile not found");
>>>>>>> 68d7f77 (Develop (#13))
      }

      const profile = await this.prisma.providerProfile.update({
        where: { userId },
<<<<<<< HEAD
        data: { avatarUrl: url },
=======
        data: { avatarUrl },
>>>>>>> 68d7f77 (Develop (#13))
      });
      this.usersLogger.logAvatarUploaded(userId, role, ip);
      return this.formatProviderProfile(profile, user);
    }

    if (role === "CLIENT") {
      const existingProfile = await this.prisma.clientProfile.findUnique({
        where: { userId },
      });
      if (!existingProfile) {
<<<<<<< HEAD
        throw new NotFoundException("Perfil de cliente não encontrado");
      }

      if (existingProfile.avatarUrl) {
        const oldFileName = this.minio.extractFileName(
          existingProfile.avatarUrl,
          this.minio.avatarBucket,
        );
        await this.minio
          .deleteFile(oldFileName, this.minio.avatarBucket)
          .catch(() => {});
=======
        throw new NotFoundException("Client profile not found");
>>>>>>> 68d7f77 (Develop (#13))
      }

      const profile = await this.prisma.clientProfile.update({
        where: { userId },
<<<<<<< HEAD
        data: { avatarUrl: url },
=======
        data: { avatarUrl },
>>>>>>> 68d7f77 (Develop (#13))
      });
      this.usersLogger.logAvatarUploaded(userId, role, ip);
      return this.formatClientProfile(profile, user);
    }

<<<<<<< HEAD
    throw new BadRequestException("Função inválida");
  }

  async getPublicProviderProfile(providerProfileId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
            email: true,
            phone: true,
            postalCode: true,
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

    return {
      id: profile.id,
      user: {
        id: profile.user.id,
        complete_name: profile.user.completeName,
        email: profile.user.email,
        phone: profile.user.phone,
        postal_code: profile.user.postalCode,
      },
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      hourly_rate: profile.hourlyRate,
      skills: profile.skills,
      portfolio: profile.portfolio,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      services: profile.services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fixed_price: s.fixedPrice,
        category_id: s.categoryId,
        category: s.category
          ? { id: s.category.id, name: s.category.name, slug: s.category.slug }
          : null,
      })),
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
=======
    throw new BadRequestException("Invalid role");
>>>>>>> 68d7f77 (Develop (#13))
  }
}

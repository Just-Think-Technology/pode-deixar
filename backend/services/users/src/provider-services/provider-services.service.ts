import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateProviderServiceDto } from "./dto/create-provider-service.dto";
import { UpdateProviderServiceDto } from "./dto/update-provider-service.dto";
import { SearchProvidersQueryDto } from "./dto/search-providers-query.dto";

@Injectable()
export class ProviderServicesService {
  constructor(
    private prisma: PrismaService,
    private usersLogger: UsersLoggerService,
  ) {}

  async getProviderProfileByUserId(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException("Perfil de prestador não encontrado");
    }
    return profile;
  }

  private async getProviderProfile(providerProfileId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile) {
      throw new NotFoundException("Perfil de prestador não encontrado");
    }
    return profile;
  }

  private formatService(service: any) {
    return {
      id: service.id,
      provider_profile_id: service.providerProfileId,
      title: service.title,
      description: service.description,
      fixed_price: service.fixedPrice,
      category: service.category,
      duration_minutes: service.durationMinutes,
      is_active: service.isActive,
      created_at: service.createdAt,
      updated_at: service.updatedAt,
    };
  }

  async createService(
    providerProfileId: string,
    dto: CreateProviderServiceDto,
    ip?: string,
  ) {
    await this.getProviderProfile(providerProfileId);

    const service = await this.prisma.providerService.create({
      data: {
        providerProfileId,
        title: dto.title,
        description: dto.description,
        fixedPrice: dto.fixedPrice,
        category: dto.category,
        durationMinutes: dto.durationMinutes,
        isActive: true,
      },
    });

    this.usersLogger.logServiceCreated(providerProfileId, service.id, ip);

    return this.formatService(service);
  }

  async getMyServices(providerProfileId: string) {
    await this.getProviderProfile(providerProfileId);

    const services = await this.prisma.providerService.findMany({
      where: { providerProfileId },
      orderBy: { createdAt: "desc" },
    });

    return services.map((s) => this.formatService(s));
  }

  async getProviderServices(providerProfileId: string) {
    await this.getProviderProfile(providerProfileId);

    const services = await this.prisma.providerService.findMany({
      where: { providerProfileId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return services.map((s) => this.formatService(s));
  }

  async updateService(
    providerProfileId: string,
    serviceId: string,
    dto: UpdateProviderServiceDto,
    ip?: string,
  ) {
    const existing = await this.prisma.providerService.findUnique({
      where: { id: serviceId },
    });

    if (!existing) {
      throw new NotFoundException("Serviço não encontrado");
    }

    if (existing.providerProfileId !== providerProfileId) {
      throw new BadRequestException("Serviço não pertence a este prestador");
    }

    const service = await this.prisma.providerService.update({
      where: { id: serviceId },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        fixedPrice: dto.fixedPrice ?? existing.fixedPrice,
        category: dto.category ?? existing.category,
        durationMinutes: dto.durationMinutes ?? existing.durationMinutes,
      },
    });

    this.usersLogger.logServiceUpdated(providerProfileId, serviceId, ip);

    return this.formatService(service);
  }

  async deleteService(
    providerProfileId: string,
    serviceId: string,
    ip?: string,
  ) {
    const existing = await this.prisma.providerService.findUnique({
      where: { id: serviceId },
    });

    if (!existing) {
      throw new NotFoundException("Serviço não encontrado");
    }

    if (existing.providerProfileId !== providerProfileId) {
      throw new BadRequestException("Serviço não pertence a este prestador");
    }

    const service = await this.prisma.providerService.update({
      where: { id: serviceId },
      data: { isActive: false },
    });

    this.usersLogger.logServiceDeleted(providerProfileId, serviceId, ip);

    return this.formatService(service);
  }

  async searchProviders(query: SearchProvidersQueryDto) {
    const profileIds = await this.findMatchingProfileIds(query);

    if (profileIds.length === 0) {
      return [];
    }

    const serviceWhere: any = { isActive: true };
    if (query.category) {
      serviceWhere.category = query.category;
    }
    if (query.q) {
      serviceWhere.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const profiles = await this.prisma.providerProfile.findMany({
      where: { id: { in: profileIds } },
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
          where: serviceWhere,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return profiles.map((profile) => ({
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
      skills: profile.skills,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      services: profile.services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fixed_price: s.fixedPrice,
        category: s.category,
        duration_minutes: s.durationMinutes,
      })),
    }));
  }

  private async findMatchingProfileIds(query: SearchProvidersQueryDto): Promise<string[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.q) {
      conditions.push(
        `unaccent(ps.title) ILIKE unaccent($${paramIndex})`,
        `unaccent(ps.description) ILIKE unaccent($${paramIndex})`,
        `unaccent(u.complete_name) ILIKE unaccent($${paramIndex})`,
      );
      params.push(`%${query.q}%`);
      paramIndex++;
    }

    if (query.category) {
      conditions.push(`ps.category = $${paramIndex}`);
      params.push(query.category);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `AND (${conditions.join(' OR ')})`
      : '';

    const sql = `
      SELECT DISTINCT pp.id
      FROM provider_profiles pp
      JOIN users u ON u.id = pp.user_id
      JOIN provider_services ps ON ps.provider_profile_id = pp.id AND ps.is_active = TRUE
      WHERE 1=1 ${whereClause}
    `;

    const result = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(sql, ...params);
    return result.map((r) => r.id);
  }
}

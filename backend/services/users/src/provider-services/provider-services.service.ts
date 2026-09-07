import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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

  private formatService(service: any): {
    id: string;
    provider_profile_id: string;
    title: string;
    description: string;
    fixed_price: number;
    category_id: string;
    category?: { id: string; name: string; slug: string } | null;
    images?: { id: string; url: string; created_at: Date }[] | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  } {
    const fixedPriceNumber =
      service.fixedPrice != null
        ? Number(service.fixedPrice)
        : service.fixedPrice;
    return {
      id: service.id,
      provider_profile_id: service.providerProfileId,
      title: service.title,
      description: service.description,
      fixed_price: fixedPriceNumber,
      category_id: service.categoryId,
      category: service.category
        ? {
            id: service.category.id,
            name: service.category.name,
            slug: service.category.slug,
          }
        : null,
      images: service.images
        ? service.images.map((img: any) => ({
            id: img.id,
            url: img.url,
            created_at: img.createdAt,
          }))
        : [],
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
        categoryId: dto.categoryId,
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
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
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return services.map((s) => this.formatService(s));
  }

  async getProviderServices(providerProfileId: string) {
    await this.getProviderProfile(providerProfileId);

    const services = await this.prisma.providerService.findMany({
      where: { providerProfileId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
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
      throw new ForbiddenException("Serviço não pertence a este prestador");
    }

    const service = await this.prisma.providerService.update({
      where: { id: serviceId },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        fixedPrice: dto.fixedPrice ?? existing.fixedPrice,
        categoryId: dto.categoryId ?? existing.categoryId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
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
      throw new ForbiddenException("Serviço não pertence a este prestador");
    }

    const service = await this.prisma.providerService.update({
      where: { id: serviceId },
      data: { isActive: false },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    this.usersLogger.logServiceDeleted(providerProfileId, serviceId, ip);

    return this.formatService(service);
  }

  private removerAcentos(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private formatProfileResult(profile: any): {
    id: string;
    user: UserResponse;
    avatar_url?: string;
    bio?: string;
    skills?: string[];
    rating?: number;
    total_reviews?: number;
    is_available?: boolean;
    services: {
      id: string;
      title: string;
      description: string;
      fixed_price: number;
      category_id: string;
      category?: { id: string; name: string; slug: string } | null;
      images?: { id: string; url: string; created_at: Date }[] | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }[];
  } {
    return {
      id: profile.id,
      user: {
        id: profile.user.id,
        complete_name: profile.user.completeName,
        email: profile.user.email,
        phone: profile.user.phone,
        postal_code: profile.user.postalCode,
      },
      avatar_url: profile.avatarUrl ?? undefined,
      bio: profile.bio ?? undefined,
      skills: profile.skills,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      services: profile.services.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fixed_price: s.fixedPrice != null ? Number(s.fixedPrice) : s.fixedPrice,
        category_id: s.categoryId,
        category: s.category
          ? { id: s.category.id, name: s.category.name, slug: s.category.slug }
          : null,
        images: s.images
          ? s.images.map((img: any) => ({
              id: img.id,
              url: img.url,
              created_at: img.createdAt,
            }))
          : [],
        is_active: s.isActive,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      })),
    };
  }

  async searchProviders(query: SearchProvidersQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const serviceFilter: any = { isActive: true };
    const profileFilter: any = { services: { some: { isActive: true } } };

    if (query.categoryId) {
      serviceFilter.categoryId = query.categoryId;
      profileFilter.services = {
        some: { isActive: true, categoryId: query.categoryId },
      };
    }

    const includeClause = {
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
        where: serviceFilter,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            select: { id: true, url: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    } as const;

    const allProfiles = await this.prisma.providerProfile.findMany({
      where: profileFilter,
      include: includeClause,
    });

    let result = allProfiles.map((p: any) => this.formatProfileResult(p));

    if (query.q) {
      const termo = this.removerAcentos(query.q);
      result = result.filter((p) => {
        const nome = this.removerAcentos(p.user.complete_name);
        if (nome.includes(termo)) return true;
        return p.services.some(
          (s: any) =>
            this.removerAcentos(s.title).includes(termo) ||
            this.removerAcentos(s.description).includes(termo),
        );
      });
    }

    if (query.postalCode) {
      const clientCep = parseInt(query.postalCode.replace(/\D/g, ""), 10);
      result.sort((a, b) => {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        const ratingDiff = Math.abs(ratingB - ratingA);
        if (ratingDiff > 0.5) {
          return ratingB - ratingA;
        }
        const cepA = parseInt(
          (a.user.postal_code || "").replace(/\D/g, ""),
          10,
        );
        const cepB = parseInt(
          (b.user.postal_code || "").replace(/\D/g, ""),
          10,
        );
        return Math.abs(cepA - clientCep) - Math.abs(cepB - clientCep);
      });
    } else {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    const paginados = result.slice(skip, skip + limit);

    return {
      data: paginados,
      meta: {
        total: result.length,
        page,
        limit,
        totalPages: Math.ceil(result.length / limit),
      },
    };
  }
}

export interface UserResponse {
  id: string;
  complete_name: string;
  email: string;
  phone: string;
  postal_code: string;
}

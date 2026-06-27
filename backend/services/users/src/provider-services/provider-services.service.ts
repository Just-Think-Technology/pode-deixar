import {
  Injectable,
  NotFoundException,
  BadRequestException,
<<<<<<< HEAD
  ForbiddenException,
=======
>>>>>>> 68d7f77 (Develop (#13))
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersLoggerService } from "../shared/users-logger.service";
import { CreateProviderServiceDto } from "./dto/create-provider-service.dto";
import { UpdateProviderServiceDto } from "./dto/update-provider-service.dto";
<<<<<<< HEAD
import { SearchProvidersQueryDto } from "./dto/search-providers-query.dto";
=======
>>>>>>> 68d7f77 (Develop (#13))

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
<<<<<<< HEAD
      throw new NotFoundException("Perfil de prestador não encontrado");
=======
      throw new NotFoundException("Provider profile not found");
>>>>>>> 68d7f77 (Develop (#13))
    }
    return profile;
  }

  private async getProviderProfile(providerProfileId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile) {
<<<<<<< HEAD
      throw new NotFoundException("Perfil de prestador não encontrado");
=======
      throw new NotFoundException("Provider profile not found");
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
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
=======
      category: service.category,
      duration_minutes: service.durationMinutes,
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
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
=======
        category: dto.category,
        durationMinutes: dto.durationMinutes,
        isActive: true,
      },
>>>>>>> 68d7f77 (Develop (#13))
    });

    this.usersLogger.logServiceCreated(providerProfileId, service.id, ip);

    return this.formatService(service);
  }

  async getMyServices(providerProfileId: string) {
    await this.getProviderProfile(providerProfileId);

    const services = await this.prisma.providerService.findMany({
      where: { providerProfileId },
      orderBy: { createdAt: "desc" },
<<<<<<< HEAD
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
=======
>>>>>>> 68d7f77 (Develop (#13))
    });

    return services.map((s) => this.formatService(s));
  }

  async getProviderServices(providerProfileId: string) {
    await this.getProviderProfile(providerProfileId);

    const services = await this.prisma.providerService.findMany({
      where: { providerProfileId, isActive: true },
      orderBy: { createdAt: "desc" },
<<<<<<< HEAD
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
=======
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new NotFoundException("Serviço não encontrado");
    }

    if (existing.providerProfileId !== providerProfileId) {
      throw new ForbiddenException("Serviço não pertence a este prestador");
=======
      throw new NotFoundException("Service not found");
    }

    if (existing.providerProfileId !== providerProfileId) {
      throw new BadRequestException("Service does not belong to this provider");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const service = await this.prisma.providerService.update({
      where: { id: serviceId },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        fixedPrice: dto.fixedPrice ?? existing.fixedPrice,
<<<<<<< HEAD
        categoryId: dto.categoryId ?? existing.categoryId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
=======
        category: dto.category ?? existing.category,
        durationMinutes: dto.durationMinutes ?? existing.durationMinutes,
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
      throw new NotFoundException("Serviço não encontrado");
    }

    if (existing.providerProfileId !== providerProfileId) {
      throw new ForbiddenException("Serviço não pertence a este prestador");
=======
      throw new NotFoundException("Service not found");
    }

    if (existing.providerProfileId !== providerProfileId) {
      throw new BadRequestException("Service does not belong to this provider");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const service = await this.prisma.providerService.update({
      where: { id: serviceId },
      data: { isActive: false },
<<<<<<< HEAD
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
=======
>>>>>>> 68d7f77 (Develop (#13))
    });

    this.usersLogger.logServiceDeleted(providerProfileId, serviceId, ip);

    return this.formatService(service);
  }
<<<<<<< HEAD

  private removerAcentos(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private formatProfileResult(profile: any) {
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
      skills: profile.skills,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      is_available: profile.isAvailable,
      services: profile.services.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fixed_price: s.fixedPrice,
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

    let result = allProfiles.map((p) => this.formatProfileResult(p));

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
        const ratingDiff = Math.abs(b.rating - a.rating);
        if (ratingDiff > 0.5) {
          return b.rating - a.rating;
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
      result.sort((a, b) => b.rating - a.rating);
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
=======
>>>>>>> 68d7f77 (Develop (#13))
}

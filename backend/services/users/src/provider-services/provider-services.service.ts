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

  private removerAcentos(texto: string): string {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  async searchProviders(query: SearchProvidersQueryDto) {
    const serviceFilter: any = { isActive: true };
    const profileFilter: any = { services: { some: { isActive: true } } };

    if (query.category) {
      serviceFilter.category = query.category;
      profileFilter.services = {
        some: { isActive: true, category: query.category },
      };
    }

    const profiles = await this.prisma.providerProfile.findMany({
      where: profileFilter,
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
          where: serviceFilter,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    let resultados = profiles.map((profile) => ({
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

    if (query.q) {
      const termo = this.removerAcentos(query.q);
      resultados = resultados.filter((p) => {
        const nome = this.removerAcentos(p.user.complete_name);
        if (nome.includes(termo)) return true;
        return p.services.some(
          (s) =>
            this.removerAcentos(s.title).includes(termo) ||
            this.removerAcentos(s.description).includes(termo),
        );
      });
    }

    return resultados;
  }
}

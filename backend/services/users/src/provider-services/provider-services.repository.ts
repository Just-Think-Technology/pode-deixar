import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

export interface CreateProviderServiceData {
  providerProfileId: string;
  title: string;
  description: string;
  fixedPrice: number;
  categoryId: string;
}

export interface UpdateProviderServiceData {
  title: any;
  description: any;
  fixedPrice: any;
  categoryId: any;
}

@Injectable()
export class ProviderServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProviderProfileByUserId(userId: string) {
    return this.prisma.providerProfile.findUnique({ where: { userId } });
  }

  findProviderProfileById(providerProfileId: string) {
    return this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
  }

  findProviderServiceById(serviceId: string) {
    return this.prisma.providerService.findUnique({ where: { id: serviceId } });
  }

  createProviderService(data: CreateProviderServiceData) {
    return this.prisma.providerService.create({
      data: {
        providerProfileId: data.providerProfileId,
        title: data.title,
        description: data.description,
        fixedPrice: data.fixedPrice,
        categoryId: data.categoryId,
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
  }

  findServicesByProfileId(providerProfileId: string) {
    return this.prisma.providerService.findMany({
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
  }

  findActiveServicesByProfileId(providerProfileId: string) {
    return this.prisma.providerService.findMany({
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
  }

  updateProviderService(serviceId: string, data: UpdateProviderServiceData) {
    return this.prisma.providerService.update({
      where: { id: serviceId },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  softDeleteProviderService(serviceId: string) {
    return this.prisma.providerService.update({
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
  }

  countProviderProfiles(where: any) {
    return this.prisma.providerProfile.count({ where });
  }

  findProviderProfilesForSearch(
    where: any,
    serviceFilter: any,
    skip: number,
    take: number,
  ) {
    // Public select excludes PII; postal-code proximity ordering was removed
    // with the postal code.
    return this.prisma.providerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            completeName: true,
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
      },
      orderBy: { rating: "desc" },
      skip,
      take,
    });
  }
}

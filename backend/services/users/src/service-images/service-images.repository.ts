import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

@Injectable()
export class ServiceImagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProviderProfileByUserId(userId: string) {
    return this.prisma.providerProfile.findUnique({ where: { userId } });
  }

  findProviderServiceById(serviceId: string) {
    return this.prisma.providerService.findUnique({ where: { id: serviceId } });
  }

  createServiceImage(serviceId: string, url: string) {
    return this.prisma.serviceImage.create({
      data: {
        providerServiceId: serviceId,
        url,
      },
    });
  }

  findServiceImagesByServiceId(serviceId: string) {
    return this.prisma.serviceImage.findMany({
      where: { providerServiceId: serviceId },
      orderBy: { createdAt: "desc" },
    });
  }

  findServiceImageById(imageId: string) {
    return this.prisma.serviceImage.findUnique({ where: { id: imageId } });
  }

  deleteServiceImage(imageId: string) {
    return this.prisma.serviceImage.delete({ where: { id: imageId } });
  }
}

import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { ServiceImagesRepository } from "../src/service-images/service-images.repository";

describe("ServiceImagesRepository", () => {
  let repository: ServiceImagesRepository;

  const mockPrisma = {
    providerProfile: {
      findUnique: jest.fn(),
    },
    providerService: {
      findUnique: jest.fn(),
    },
    serviceImage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceImagesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ServiceImagesRepository>(ServiceImagesRepository);
    jest.clearAllMocks();
  });

  it("finds a provider profile by user id", async () => {
    mockPrisma.providerProfile.findUnique.mockResolvedValue({ id: "p-1" });

    await repository.findProviderProfileByUserId("user-1");

    expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("finds a provider service by id", async () => {
    mockPrisma.providerService.findUnique.mockResolvedValue({ id: "s-1" });

    await repository.findProviderServiceById("service-1");

    expect(mockPrisma.providerService.findUnique).toHaveBeenCalledWith({
      where: { id: "service-1" },
    });
  });

  it("creates a service image for the service", async () => {
    mockPrisma.serviceImage.create.mockResolvedValue({ id: "img-1" });

    await repository.createServiceImage("service-1", "http://img.com/a.png");

    expect(mockPrisma.serviceImage.create).toHaveBeenCalledWith({
      data: {
        providerServiceId: "service-1",
        url: "http://img.com/a.png",
      },
    });
  });

  it("lists service images ordered by creation", async () => {
    mockPrisma.serviceImage.findMany.mockResolvedValue([]);

    await repository.findServiceImagesByServiceId("service-1");

    expect(mockPrisma.serviceImage.findMany).toHaveBeenCalledWith({
      where: { providerServiceId: "service-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("finds a service image by id", async () => {
    mockPrisma.serviceImage.findUnique.mockResolvedValue({ id: "img-1" });

    await repository.findServiceImageById("img-1");

    expect(mockPrisma.serviceImage.findUnique).toHaveBeenCalledWith({
      where: { id: "img-1" },
    });
  });

  it("deletes a service image by id", async () => {
    mockPrisma.serviceImage.delete.mockResolvedValue({ id: "img-1" });

    await repository.deleteServiceImage("img-1");

    expect(mockPrisma.serviceImage.delete).toHaveBeenCalledWith({
      where: { id: "img-1" },
    });
  });
});

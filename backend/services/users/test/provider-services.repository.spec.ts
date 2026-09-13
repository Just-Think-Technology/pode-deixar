import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { ProviderServicesRepository } from "../src/provider-services/provider-services.repository";

describe("ProviderServicesRepository", () => {
  let repository: ProviderServicesRepository;

  const mockPrisma = {
    providerProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    providerService: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderServicesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ProviderServicesRepository>(
      ProviderServicesRepository,
    );
    jest.clearAllMocks();
  });

  it("finds a provider profile by user id", async () => {
    mockPrisma.providerProfile.findUnique.mockResolvedValue({ id: "p-1" });

    await repository.findProviderProfileByUserId("user-1");

    expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("finds a provider profile by id", async () => {
    mockPrisma.providerProfile.findUnique.mockResolvedValue({ id: "p-1" });

    await repository.findProviderProfileById("p-1");

    expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
      where: { id: "p-1" },
    });
  });

  it("creates a provider service as active with category and images", async () => {
    mockPrisma.providerService.create.mockResolvedValue({ id: "service-1" });

    await repository.createProviderService({
      providerProfileId: "provider-profile-1",
      title: "Instalação de chuveiro elétrico",
      description: "Instalação completa",
      fixedPrice: 150.0,
      categoryId: "cat-eletrica",
    });

    expect(mockPrisma.providerService.create).toHaveBeenCalledWith({
      data: {
        providerProfileId: "provider-profile-1",
        title: "Instalação de chuveiro elétrico",
        description: "Instalação completa",
        fixedPrice: 150.0,
        categoryId: "cat-eletrica",
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
  });

  it("lists all services of a profile ordered by creation", async () => {
    mockPrisma.providerService.findMany.mockResolvedValue([]);

    await repository.findServicesByProfileId("provider-profile-1");

    expect(mockPrisma.providerService.findMany).toHaveBeenCalledWith({
      where: { providerProfileId: "provider-profile-1" },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("lists only active services of a profile", async () => {
    mockPrisma.providerService.findMany.mockResolvedValue([]);

    await repository.findActiveServicesByProfileId("provider-profile-1");

    expect(mockPrisma.providerService.findMany).toHaveBeenCalledWith({
      where: { providerProfileId: "provider-profile-1", isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("finds a provider service by id", async () => {
    mockPrisma.providerService.findUnique.mockResolvedValue({ id: "s-1" });

    await repository.findProviderServiceById("service-1");

    expect(mockPrisma.providerService.findUnique).toHaveBeenCalledWith({
      where: { id: "service-1" },
    });
  });

  it("updates a provider service with category and images", async () => {
    mockPrisma.providerService.update.mockResolvedValue({ id: "service-1" });

    await repository.updateProviderService("service-1", {
      title: "Updated",
      description: "Updated description",
      fixedPrice: 180.0,
      categoryId: "cat-eletrica",
    });

    expect(mockPrisma.providerService.update).toHaveBeenCalledWith({
      where: { id: "service-1" },
      data: {
        title: "Updated",
        description: "Updated description",
        fixedPrice: 180.0,
        categoryId: "cat-eletrica",
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("soft deletes a provider service", async () => {
    mockPrisma.providerService.update.mockResolvedValue({ id: "service-1" });

    await repository.softDeleteProviderService("service-1");

    expect(mockPrisma.providerService.update).toHaveBeenCalledWith({
      where: { id: "service-1" },
      data: { isActive: false },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  it("counts provider profiles with the given filter", async () => {
    mockPrisma.providerProfile.count.mockResolvedValue(1);
    const where = { AND: [{ services: { some: { isActive: true } } }] };

    await repository.countProviderProfiles(where);

    expect(mockPrisma.providerProfile.count).toHaveBeenCalledWith({ where });
  });

  it("searches provider profiles ordered by rating with skip/take", async () => {
    mockPrisma.providerProfile.findMany.mockResolvedValue([]);
    const where = { AND: [{ services: { some: { isActive: true } } }] };
    const serviceFilter = { isActive: true };

    await repository.findProviderProfilesForSearch(where, serviceFilter, 0, 10);

    expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith({
      where,
      include: {
        user: { select: { id: true, completeName: true } },
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
      skip: 0,
      take: 10,
    });
  });

  it("paginates the search with the given skip/take cap", async () => {
    mockPrisma.providerProfile.findMany.mockResolvedValue([]);
    const where = { AND: [{ services: { some: { isActive: true } } }] };

    await repository.findProviderProfilesForSearch(
      where,
      { isActive: true },
      50,
      50,
    );

    expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50 }),
    );
  });
});

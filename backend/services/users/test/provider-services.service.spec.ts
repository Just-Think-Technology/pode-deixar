import { Test, TestingModule } from "@nestjs/testing";
import { ProviderServicesService } from "../src/provider-services/provider-services.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { UsersLoggerService } from "../src/shared/users-logger.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { SearchProvidersQueryDto } from "../src/provider-services/dto/search-providers-query.dto";

describe("ProviderServicesService", () => {
  let service: ProviderServicesService;

  const mockProviderProfile = {
    id: "provider-profile-1",
    userId: "user-1",
    avatarUrl: null,
    bio: "Test bio",
    hourlyRate: 50,
    skills: ["eletrica"],
    portfolio: [],
    rating: 0,
    totalReviews: 0,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: "user-1",
    completeName: "Test Provider",
    email: "provider@test.com",
    phone: "123",
    postalCode: "12345",
    role: "PROVIDER",
  };

  const mockService = {
    id: "service-1",
    providerProfileId: "provider-profile-1",
    title: "Instalação de chuveiro elétrico",
    description: "Instalação completa de chuveiro elétrico com garantia",
    fixedPrice: 150.0,
    category: "ELETRICA",
    durationMinutes: 60,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    providerProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    providerService: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockLogger = {
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logServiceCreated: jest.fn(),
    logServiceUpdated: jest.fn(),
    logServiceDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderServicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ProviderServicesService>(ProviderServicesService);
    jest.clearAllMocks();
  });

  describe("createService", () => {
    const createDto = {
      title: "Instalação de chuveiro elétrico",
      description: "Instalação completa de chuveiro elétrico com garantia",
      fixedPrice: 150.0,
      category: "ELETRICA",
      durationMinutes: 60,
    };

    it("should create a service for provider", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(
        mockProviderProfile,
      );
      mockPrisma.providerService.create.mockResolvedValue(mockService);

      const result = await service.createService(
        "provider-profile-1",
        createDto,
        "127.0.0.1",
      );

      expect(result).toBeDefined();
      expect(result.title).toBe("Instalação de chuveiro elétrico");
      expect(result.fixed_price).toBe(150.0);
      expect(mockLogger.logServiceCreated).toHaveBeenCalledWith(
        "provider-profile-1",
        "service-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createService("invalid-id", createDto, "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when user is not a provider", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: "CLIENT",
      });

      await expect(
        service.createService("provider-profile-1", createDto, "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getMyServices", () => {
    it("should return list of services for provider", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(
        mockProviderProfile,
      );
      mockPrisma.providerService.findMany.mockResolvedValue([mockService]);

      const result = await service.getMyServices("provider-profile-1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Instalação de chuveiro elétrico");
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMyServices("invalid-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getProviderServices", () => {
    it("should return public list of services for a provider", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(
        mockProviderProfile,
      );
      mockPrisma.providerService.findMany.mockResolvedValue([mockService]);

      const result = await service.getProviderServices("provider-profile-1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Instalação de chuveiro elétrico");
      expect(mockPrisma.providerService.findMany).toHaveBeenCalledWith({
        where: { providerProfileId: "provider-profile-1", isActive: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when provider has no services", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(
        mockProviderProfile,
      );
      mockPrisma.providerService.findMany.mockResolvedValue([]);

      const result = await service.getProviderServices("provider-profile-1");

      expect(result).toHaveLength(0);
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProviderServices("invalid-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateService", () => {
    const updateDto = {
      title: "Instalação de chuveiro elétrico - Atualizado",
      fixedPrice: 180.0,
    };

    it("should update service", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue(mockService);
      mockPrisma.providerService.update.mockResolvedValue({
        ...mockService,
        ...updateDto,
      });

      const result = await service.updateService(
        "provider-profile-1",
        "service-1",
        updateDto,
        "127.0.0.1",
      );

      expect(result.title).toBe("Instalação de chuveiro elétrico - Atualizado");
      expect(result.fixed_price).toBe(180.0);
      expect(mockLogger.logServiceUpdated).toHaveBeenCalledWith(
        "provider-profile-1",
        "service-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when service not found", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue(null);

      await expect(
        service.updateService(
          "provider-profile-1",
          "invalid-id",
          updateDto,
          "127.0.0.1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when service belongs to another provider", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue({
        ...mockService,
        providerProfileId: "other-profile",
      });

      await expect(
        service.updateService(
          "provider-profile-1",
          "service-1",
          updateDto,
          "127.0.0.1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("deleteService", () => {
    it("should soft delete service (set isActive to false)", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue(mockService);
      mockPrisma.providerService.update.mockResolvedValue({
        ...mockService,
        isActive: false,
      });

      const result = await service.deleteService(
        "provider-profile-1",
        "service-1",
        "127.0.0.1",
      );

      expect(result.is_active).toBe(false);
      expect(mockLogger.logServiceDeleted).toHaveBeenCalledWith(
        "provider-profile-1",
        "service-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when service not found", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteService("provider-profile-1", "invalid-id", "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when service belongs to another provider", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue({
        ...mockService,
        providerProfileId: "other-profile",
      });

      await expect(
        service.deleteService("provider-profile-1", "service-1", "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("searchProviders", () => {
    const mockProfileWithServices = {
      id: "provider-profile-1",
      userId: "user-1",
      avatarUrl: null,
      bio: "Eletricista experiente",
      hourlyRate: 50,
      skills: ["ELETRICA"],
      portfolio: [],
      rating: 4.5,
      totalReviews: 10,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "user-1",
        completeName: "João Eletricista",
        email: "joao@email.com",
        phone: "11999999999",
        postalCode: "01234-567",
      },
      services: [
        {
          id: "service-1",
          providerProfileId: "provider-profile-1",
          title: "Instalação de chuveiro elétrico",
          description: "Instalação completa",
          fixedPrice: 150.0,
          category: "ELETRICA",
          durationMinutes: 60,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const mockProfileWithNameMatch = {
      ...mockProfileWithServices,
      id: "provider-profile-2",
      user: {
        ...mockProfileWithServices.user,
        id: "user-2",
        completeName: "José Chuveiro",
      },
      services: [
        {
          ...mockProfileWithServices.services[0],
          id: "service-3",
          providerProfileId: "provider-profile-2",
          title: "Reparo geral",
          category: "HIDRAULICA",
        },
      ],
    };

    const mockProfileWithMultipleServices = {
      ...mockProfileWithServices,
      services: [
        ...mockProfileWithServices.services,
        {
          id: "service-2",
          providerProfileId: "provider-profile-1",
          title: "Troca de fiação",
          description: "Troca completa da fiação elétrica",
          fixedPrice: 200.0,
          category: "ELETRICA",
          durationMinutes: 90,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    it("should return all active providers when no filters", async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = {};
      const result = await service.searchProviders(query);

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].user.complete_name).toBe("João Eletricista");
      expect(result[0].services).toHaveLength(1);
    });

    it("should filter by category", async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = { category: "ELETRICA" };
      const result = await service.searchProviders(query);

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should filter by text search on service title", async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = { q: "chuveiro" };
      const result = await service.searchProviders(query);

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should filter by provider name", async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([
        mockProfileWithNameMatch,
      ]);

      const query: SearchProvidersQueryDto = { q: "José" };
      const result = await service.searchProviders(query);

      expect(result).toHaveLength(1);
      expect(result[0].user.complete_name).toBe("José Chuveiro");
    });

    it("should search ignoring accents", async () => {
      const profileComAcento = {
        ...mockProfileWithServices,
        services: [{
          ...mockProfileWithServices.services[0],
          title: "Instalação elétrica",
        }],
      };
      mockPrisma.providerProfile.findMany.mockResolvedValue([profileComAcento]);

      const query: SearchProvidersQueryDto = { q: "eletrica" };
      const result = await service.searchProviders(query);

      expect(result).toHaveLength(1);
    });

    it("should group multiple services under the same provider", async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([
        mockProfileWithMultipleServices,
      ]);

      const query: SearchProvidersQueryDto = { category: "ELETRICA" };
      const result = await service.searchProviders(query);

      expect(result).toHaveLength(1);
      expect(result[0].services).toHaveLength(2);
      expect(result[0].services[0].title).toBe("Instalação de chuveiro elétrico");
      expect(result[0].services[1].title).toBe("Troca de fiação");
    });

    it("should return empty array when no matches", async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([]);

      const query: SearchProvidersQueryDto = { category: "HIDRAULICA" };
      const result = await service.searchProviders(query);

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            services: {
              some: { isActive: true, category: "HIDRAULICA" },
            },
          },
        }),
      );
      expect(result).toHaveLength(0);
    });
  });
});

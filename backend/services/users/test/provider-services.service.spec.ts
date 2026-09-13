import { Test, TestingModule } from "@nestjs/testing";
import { ProviderServicesService } from "../src/provider-services/provider-services.service";
import { ProviderServicesRepository } from "../src/provider-services/provider-services.repository";
import { UsersLoggerService } from "../src/shared/users-logger.service";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
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

  const mockCategory = {
    id: "cat-eletrica",
    name: "Elétrica",
    slug: "eletrica",
  };

  const mockService = {
    id: "service-1",
    providerProfileId: "provider-profile-1",
    title: "Instalação de chuveiro elétrico",
    description: "Instalação completa de chuveiro elétrico com garantia",
    fixedPrice: 150.0,
    categoryId: "cat-eletrica",
    category: mockCategory,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findProviderProfileByUserId: jest.fn(),
    findProviderProfileById: jest.fn(),
    findProviderServiceById: jest.fn(),
    createProviderService: jest.fn(),
    findServicesByProfileId: jest.fn(),
    findActiveServicesByProfileId: jest.fn(),
    updateProviderService: jest.fn(),
    softDeleteProviderService: jest.fn(),
    countProviderProfiles: jest.fn(),
    findProviderProfilesForSearch: jest.fn(),
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
        { provide: ProviderServicesRepository, useValue: mockRepository },
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
      categoryId: "cat-eletrica",
    };

     it("should create a service for provider", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(
        mockProviderProfile,
      );
      mockRepository.createProviderService.mockResolvedValue(mockService);

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
      mockRepository.findProviderProfileById.mockResolvedValue(null);

      await expect(
        service.createService("invalid-id", createDto, "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when user is not a provider", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(null);

      await expect(
        service.createService("provider-profile-1", createDto, "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getMyServices", () => {
    it("should return list of services for provider", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(
        mockProviderProfile,
      );
      mockRepository.findServicesByProfileId.mockResolvedValue([mockService]);

      const result = await service.getMyServices("provider-profile-1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Instalação de chuveiro elétrico");
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(null);

      await expect(service.getMyServices("invalid-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getProviderServices", () => {
    it("should return public list of services for a provider", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(
        mockProviderProfile,
      );
      mockRepository.findActiveServicesByProfileId.mockResolvedValue([
        mockService,
      ]);

      const result = await service.getProviderServices("provider-profile-1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Instalação de chuveiro elétrico");
      expect(
        mockRepository.findActiveServicesByProfileId,
      ).toHaveBeenCalledWith("provider-profile-1");
    });

    it("should return empty array when provider has no services", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(
        mockProviderProfile,
      );
      mockRepository.findActiveServicesByProfileId.mockResolvedValue([]);

      const result = await service.getProviderServices("provider-profile-1");

      expect(result).toHaveLength(0);
    });

    it("should throw NotFoundException when provider profile not found", async () => {
      mockRepository.findProviderProfileById.mockResolvedValue(null);

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
      mockRepository.findProviderServiceById.mockResolvedValue(mockService);
      mockRepository.updateProviderService.mockResolvedValue({
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
      mockRepository.findProviderServiceById.mockResolvedValue(null);

      await expect(
        service.updateService(
          "provider-profile-1",
          "invalid-id",
          updateDto,
          "127.0.0.1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when service belongs to another provider", async () => {
      mockRepository.findProviderServiceById.mockResolvedValue({
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
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("deleteService", () => {
    it("should soft delete service (set isActive to false)", async () => {
      mockRepository.findProviderServiceById.mockResolvedValue(mockService);
      mockRepository.softDeleteProviderService.mockResolvedValue({
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
      mockRepository.findProviderServiceById.mockResolvedValue(null);

      await expect(
        service.deleteService("provider-profile-1", "invalid-id", "127.0.0.1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when service belongs to another provider", async () => {
      mockRepository.findProviderServiceById.mockResolvedValue({
        ...mockService,
        providerProfileId: "other-profile",
      });

      await expect(
        service.deleteService("provider-profile-1", "service-1", "127.0.0.1"),
      ).rejects.toThrow(ForbiddenException);
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
          categoryId: "cat-eletrica",
          category: mockCategory,
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
          categoryId: "cat-hidraulica",
          category: { id: "cat-hidraulica", name: "Hidráulica", slug: "hidraulica" },
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
          categoryId: "cat-eletrica",
          category: mockCategory,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    beforeEach(() => {
      mockRepository.findProviderProfilesForSearch.mockReset();
      // Search now paginates in the database (skip/take) and uses count for
      // the envelope total instead of loading everything into memory.
      mockRepository.countProviderProfiles.mockResolvedValue(1);
    });

    it("should return all active providers when no filters", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = {};
      const result = await service.searchProviders(query);

      expect(
        mockRepository.findProviderProfilesForSearch,
      ).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.complete_name).toBe("João Eletricista");
      // Public search result carries no PII.
      expect(result.data[0].user).not.toHaveProperty("email");
      expect(result.data[0].user).not.toHaveProperty("phone");
      expect(result.data[0].user).not.toHaveProperty("postal_code");
      expect(result.data[0].services).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should filter by category", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = { categoryId: "cat-eletrica" };
      const result = await service.searchProviders(query);

      expect(
        mockRepository.findProviderProfilesForSearch,
      ).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("should filter by text search on service title", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = { q: "chuveiro" };
      const result = await service.searchProviders(query);

      expect(
        mockRepository.findProviderProfilesForSearch,
      ).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it("should filter by provider name", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([
        mockProfileWithNameMatch,
      ]);

      const query: SearchProvidersQueryDto = { q: "José" };
      const result = await service.searchProviders(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.complete_name).toBe("José Chuveiro");
    });

    it("should search ignoring accents", async () => {
      const profileComAcento = {
        ...mockProfileWithServices,
        services: [{
          ...mockProfileWithServices.services[0],
          title: "Instalação elétrica",
        }],
      };
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([profileComAcento]);

      const query: SearchProvidersQueryDto = { q: "eletrica" };
      const result = await service.searchProviders(query);

      expect(result.data).toHaveLength(1);
    });

    it("should group multiple services under the same provider", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([
        mockProfileWithMultipleServices,
      ]);

      const query: SearchProvidersQueryDto = { categoryId: "cat-eletrica" };
      const result = await service.searchProviders(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].services).toHaveLength(2);
      expect(result.data[0].services[0].title).toBe("Instalação de chuveiro elétrico");
      expect(result.data[0].services[1].title).toBe("Troca de fiação");
    });

    it("should return empty array when no matches", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([]);
      mockRepository.countProviderProfiles.mockResolvedValue(0);

      const query: SearchProvidersQueryDto = { categoryId: "cat-hidraulica" };
      const result = await service.searchProviders(query);

      expect(
        mockRepository.findProviderProfilesForSearch,
      ).toHaveBeenCalled();
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    // CEP-proximity ordering was removed along with the CEP (PII) from the
    // public result; ordering is by rating in the database. These tests now
    // cover text filtering in the database and the pagination cap.
    it("should filter text in database with case-insensitive contains", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([
        mockProfileWithServices,
      ]);

      const query: SearchProvidersQueryDto = { q: "chuveiro" };
      const result = await service.searchProviders(query);

      expect(
        mockRepository.findProviderProfilesForSearch,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  services: expect.objectContaining({ some: expect.anything() }),
                }),
              ]),
            }),
          ]),
        }),
        expect.anything(),
        0,
        10,
      );
      expect(result.data).toHaveLength(1);
    });

    it("should cap limit at 50 and paginate with skip/take", async () => {
      mockRepository.findProviderProfilesForSearch.mockResolvedValue([]);

      const query: SearchProvidersQueryDto = { page: 2, limit: 100 };
      const result = await service.searchProviders(query);

      expect(
        mockRepository.findProviderProfilesForSearch,
      ).toHaveBeenCalledWith(expect.anything(), expect.anything(), 50, 50);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.page).toBe(2);
    });
  });
});

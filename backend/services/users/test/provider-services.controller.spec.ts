import { Test, TestingModule } from "@nestjs/testing";
import {
  ProviderServicesController,
  PublicProviderServicesController,
  ProviderServiceDetailController,
  ProviderSearchController,
} from "../src/provider-services/provider-services.controller";
import { ProviderServicesService } from "../src/provider-services/provider-services.service";

describe("ProviderServicesController", () => {
  let controller: ProviderServicesController;
  let publicController: PublicProviderServicesController;
  let detailController: ProviderServiceDetailController;
  let searchController: ProviderSearchController;

  const mockProviderServicesService = {
    getProviderProfileByUserId: jest.fn(),
    createService: jest.fn(),
    getMyServices: jest.fn(),
    getProviderServices: jest.fn(),
    updateService: jest.fn(),
    deleteService: jest.fn(),
    searchProviders: jest.fn(),
  };

  const mockProviderProfile = {
    id: "provider-profile-1",
    userId: "user-1",
  };

  const mockRequest = (overrides = {}) => ({
    user: { sub: "user-1", email: "provider@test.com", role: "PROVIDER" },
    ip: "127.0.0.1",
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        ProviderServicesController,
        PublicProviderServicesController,
        ProviderServiceDetailController,
        ProviderSearchController,
      ],
      providers: [
        { provide: ProviderServicesService, useValue: mockProviderServicesService },
      ],
    }).compile();

    controller = module.get<ProviderServicesController>(ProviderServicesController);
    publicController = module.get<PublicProviderServicesController>(PublicProviderServicesController);
    detailController = module.get<ProviderServiceDetailController>(ProviderServiceDetailController);
    searchController = module.get<ProviderSearchController>(ProviderSearchController);
    jest.clearAllMocks();
  });

  describe("ProviderServicesController - createService", () => {
    it("should resolve profile and call service.createService", async () => {
      const req = mockRequest();
      const dto = {
        title: "Instalação de chuveiro",
        description: "Descrição",
        fixedPrice: 150.0,
        category: "ELETRICA",
       };
       const expectedService = { id: "service-1", title: "Instalação de chuveiro" };

      mockProviderServicesService.getProviderProfileByUserId.mockResolvedValue(
        mockProviderProfile,
      );
      mockProviderServicesService.createService.mockResolvedValue(expectedService);

      const result = await controller.createService(req, dto as any);

      expect(
        mockProviderServicesService.getProviderProfileByUserId,
      ).toHaveBeenCalledWith("user-1");
      expect(mockProviderServicesService.createService).toHaveBeenCalledWith(
        "provider-profile-1",
        dto,
        "127.0.0.1",
      );
      expect(result).toEqual(expectedService);
    });
  });

  describe("ProviderServicesController - getMyServices", () => {
    it("should resolve profile and call service.getMyServices", async () => {
      const req = mockRequest();
      const expectedServices = [{ id: "service-1", title: "Instalação" }];

      mockProviderServicesService.getProviderProfileByUserId.mockResolvedValue(
        mockProviderProfile,
      );
      mockProviderServicesService.getMyServices.mockResolvedValue(expectedServices);

      const result = await controller.getMyServices(req);

      expect(
        mockProviderServicesService.getProviderProfileByUserId,
      ).toHaveBeenCalledWith("user-1");
      expect(mockProviderServicesService.getMyServices).toHaveBeenCalledWith(
        "provider-profile-1",
      );
      expect(result).toEqual(expectedServices);
    });
  });

  describe("PublicProviderServicesController - getProviderServices", () => {
    it("should call service.getProviderServices with providerId param", async () => {
      const expectedServices = [{ id: "service-1", title: "Instalação" }];

      mockProviderServicesService.getProviderServices.mockResolvedValue(
        expectedServices,
      );

      const result = await publicController.getProviderServices("provider-profile-1");

      expect(
        mockProviderServicesService.getProviderServices,
      ).toHaveBeenCalledWith("provider-profile-1");
      expect(result).toEqual(expectedServices);
    });
  });

  describe("ProviderServiceDetailController - updateService", () => {
    it("should resolve profile and call service.updateService", async () => {
      const req = mockRequest();
      const dto = { title: "Updated title", fixedPrice: 200.0 };
      const expectedService = { id: "service-1", title: "Updated title" };

      mockProviderServicesService.getProviderProfileByUserId.mockResolvedValue(
        mockProviderProfile,
      );
      mockProviderServicesService.updateService.mockResolvedValue(expectedService);

      const result = await detailController.updateService(
        req,
        "service-1",
        dto as any,
      );

      expect(
        mockProviderServicesService.getProviderProfileByUserId,
      ).toHaveBeenCalledWith("user-1");
      expect(mockProviderServicesService.updateService).toHaveBeenCalledWith(
        "provider-profile-1",
        "service-1",
        dto,
        "127.0.0.1",
      );
      expect(result).toEqual(expectedService);
    });
  });

  describe("ProviderServiceDetailController - deleteService", () => {
    it("should resolve profile and call service.deleteService", async () => {
      const req = mockRequest();
      const expectedService = { id: "service-1", is_active: false };

      mockProviderServicesService.getProviderProfileByUserId.mockResolvedValue(
        mockProviderProfile,
      );
      mockProviderServicesService.deleteService.mockResolvedValue(expectedService);

      const result = await detailController.deleteService(req, "service-1");

      expect(
        mockProviderServicesService.getProviderProfileByUserId,
      ).toHaveBeenCalledWith("user-1");
      expect(mockProviderServicesService.deleteService).toHaveBeenCalledWith(
        "provider-profile-1",
        "service-1",
        "127.0.0.1",
      );
      expect(result).toEqual(expectedService);
    });
  });

  describe("ProviderSearchController - searchProviders", () => {
    it("should call service.searchProviders with query params", async () => {
      const query = { category: "ELETRICA", q: "chuveiro" };
      const expectedResult = [{ id: "provider-1", services: [] }];

      mockProviderServicesService.searchProviders.mockResolvedValue(
        expectedResult,
      );

      const result = await searchController.searchProviders(query as any);

      expect(
        mockProviderServicesService.searchProviders,
      ).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it("should call service.searchProviders with empty query", async () => {
      const query = {};
      const expectedResult: any[] = [];

      mockProviderServicesService.searchProviders.mockResolvedValue(
        expectedResult,
      );

      const result = await searchController.searchProviders(query as any);

      expect(
        mockProviderServicesService.searchProviders,
      ).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });
});

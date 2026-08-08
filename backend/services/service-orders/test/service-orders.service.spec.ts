import { Test, TestingModule } from "@nestjs/testing";
import { ServiceOrdersService } from "../src/service-orders/service-orders.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { ServicesLoggerService } from "../src/shared/services-logger.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

describe("ServiceOrdersService", () => {
  let service: ServiceOrdersService;

  const mockOrder = {
    id: "order-1",
    clientId: "client-1",
    providerId: null,
    title: "Test Order",
    description: "Test Description",
    categoryId: "cat-1",
    budgetMin: null,
    budgetMax: null,
    address: {},
    status: "OPEN",
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: "cat-1", name: "Test", slug: "test" },
  };

  const mockPrisma = {
    serviceOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    providerService: {
      findUnique: jest.fn(),
    },
  };

  const mockLogger = {
    logServiceOrderCreated: jest.fn(),
    logServiceOrderUpdated: jest.fn(),
    logServiceOrderCancelled: jest.fn(),
    logInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServicesLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const dto = {
      title: "Test Order",
      description: "Test Description",
      categoryId: "cat-1",
    };

    it("should create a service order", async () => {
      mockPrisma.serviceOrder.create.mockResolvedValue(mockOrder);

      const result = await service.create("client-1", dto, "127.0.0.1");

      expect(result.client_id).toBe("client-1");
      expect(result.title).toBe("Test Order");
      expect(result.provider_id).toBeNull();
      expect(mockPrisma.serviceOrder.create).toHaveBeenCalledWith({
        data: {
          clientId: "client-1",
          providerId: null,
          title: "Test Order",
          description: "Test Description",
          categoryId: "cat-1",
          budgetMin: null,
          budgetMax: null,
        },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
      expect(mockLogger.logServiceOrderCreated).toHaveBeenCalledWith(
        "client-1",
        "order-1",
        "127.0.0.1",
      );
    });

    it("should create a service order with providerId when targeting a specific provider", async () => {
      const dtoWithProvider = { ...dto, providerId: "provider-1" };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "provider-1",
        role: "PROVIDER",
      });
      mockPrisma.serviceOrder.create.mockResolvedValue({
        ...mockOrder,
        providerId: "provider-1",
      });

      const result = await service.create("client-1", dtoWithProvider);

      expect(result.provider_id).toBe("provider-1");
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "provider-1" },
        select: { id: true, role: true },
      });
      expect(mockPrisma.serviceOrder.create).toHaveBeenCalledWith({
        data: {
          clientId: "client-1",
          providerId: "provider-1",
          title: "Test Order",
          description: "Test Description",
          categoryId: "cat-1",
          budgetMin: null,
          budgetMax: null,
        },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
    });

    it("should throw BadRequestException when providerId is the same as clientId", async () => {
      const dtoWithSelf = { ...dto, providerId: "client-1" };

      await expect(
        service.create("client-1", dtoWithSelf),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when provider does not exist", async () => {
      const dtoWithProvider = { ...dto, providerId: "nonexistent" };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create("client-1", dtoWithProvider),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when user is not a provider", async () => {
      const dtoWithProvider = { ...dto, providerId: "client-2" };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "client-2",
        role: "CLIENT",
      });

      await expect(
        service.create("client-1", dtoWithProvider),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findByClient", () => {
    it("should return orders for a client", async () => {
      mockPrisma.serviceOrder.findMany.mockResolvedValue([mockOrder]);

      const result = await service.findByClient("client-1");

      expect(result).toHaveLength(1);
      expect(result[0].client_id).toBe("client-1");
      expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
        where: { clientId: "client-1" },
        orderBy: { createdAt: "desc" },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
    });
  });

  describe("findReceivedByProvider", () => {
    it("should return orders directed to a provider", async () => {
      const directedOrder = { ...mockOrder, providerId: "provider-1" };
      mockPrisma.serviceOrder.findMany.mockResolvedValue([directedOrder]);

      const result = await service.findReceivedByProvider("provider-1");

      expect(result).toHaveLength(1);
      expect(result[0].provider_id).toBe("provider-1");
      expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
        where: { providerId: "provider-1" },
        orderBy: { createdAt: "desc" },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
    });

    it("should return empty array when no orders directed", async () => {
      mockPrisma.serviceOrder.findMany.mockResolvedValue([]);

      const result = await service.findReceivedByProvider("provider-1");

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return an order by id", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        proposals: [],
      });

      const result = await service.findById("order-1");

      expect(result.id).toBe("order-1");
      expect(result.proposals).toEqual([]);
    });

    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByIdForClient", () => {
    it("should return order with proposals when client is the owner", async () => {
      const mockProposals = [
        {
          id: "prop-1",
          providerId: "provider-1",
          price: 150,
          description: "Faço o serviço",
          estimatedDuration: "2 horas",
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          serviceOrderId: "order-1",
        },
      ];

      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "client-1",
        proposals: mockProposals,
      });

      const result = await service.findByIdForClient("order-1", "client-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.client_id).toBe("client-1");
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].provider_id).toBe("provider-1");
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIdForClient("invalid-id", "client-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when client is not the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "other-client",
        proposals: [],
      });

      await expect(
        service.findByIdForClient("order-1", "client-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("findByIdWithAccess", () => {
    it("should return full order with all proposals when CLIENT is the owner", async () => {
      const mockProposals = [
        {
          id: "prop-1",
          providerId: "provider-1",
          price: 150,
          description: "Faço o serviço",
          estimatedDuration: "2 horas",
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          serviceOrderId: "order-1",
        },
        {
          id: "prop-2",
          providerId: "provider-2",
          price: 180,
          description: "Outra proposta",
          estimatedDuration: "3 horas",
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          serviceOrderId: "order-1",
        },
      ];

      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "client-1",
        proposals: mockProposals,
      });

      const result: any = await service.findByIdWithAccess(
        "order-1",
        "client-1",
        "CLIENT",
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.proposals).toHaveLength(2);
    });

    it("should return order with own proposal when PROVIDER has a proposal", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        proposals: [
          {
            id: "prop-1",
            providerId: "provider-1",
            price: 150,
            description: "Proposta",
            estimatedDuration: "2h",
            status: "PENDING",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result: any = await service.findByIdWithAccess(
        "order-1",
        "provider-1",
        "PROVIDER",
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].provider_id).toBe("provider-1");
    });

    it("should return order without proposals when PROVIDER is the target but has no proposal", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        providerId: "provider-1",
        proposals: [],
      });

      const result: any = await service.findByIdWithAccess(
        "order-1",
        "provider-1",
        "PROVIDER",
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.proposals).toBeUndefined();
    });

    it("should throw ForbiddenException when PROVIDER is not the target and has no proposal", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        providerId: "provider-2",
        proposals: [],
      });

      await expect(
        service.findByIdWithAccess("order-1", "provider-1", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when CLIENT is not the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "other-client",
        proposals: [],
      });

      await expect(
        service.findByIdWithAccess("order-1", "client-1", "CLIENT"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIdWithAccess("invalid-id", "client-1", "CLIENT"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOpenOrders", () => {
    it("should return only open orders", async () => {
      mockPrisma.serviceOrder.findMany.mockResolvedValue([mockOrder]);

      const result = await service.findOpenOrders();

      expect(result).toHaveLength(1);
      expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
    });
  });

  describe("update", () => {
    it("should update an order", async () => {
      const updateDto = { title: "Updated Title" };
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.serviceOrder.update.mockResolvedValue({
        ...mockOrder,
        title: "Updated Title",
      });

      const result = await service.update("client-1", "order-1", updateDto);

      expect(result.title).toBe("Updated Title");
    });

    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.update("client-1", "nonexistent", {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when client does not own order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.update("other-client", "order-1", {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        status: "IN_PROGRESS",
      });

      await expect(
        service.update("client-1", "order-1", {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancel", () => {
    it("should cancel an order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.serviceOrder.update.mockResolvedValue({
        ...mockOrder,
        status: "CANCELLED",
      });

      const result = await service.cancel("client-1", "order-1");

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw BadRequestException when order already cancelled", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        status: "CANCELLED",
      });

      await expect(service.cancel("client-1", "order-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when order is completed", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        status: "COMPLETED",
      });

      await expect(service.cancel("client-1", "order-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.cancel("client-1", "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when client does not own order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.cancel("other-client", "order-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("hireFromProvider", () => {
    const hireDto = { providerServiceId: "service-1" };

    const mockProviderService = {
      id: "service-1",
      title: "Instalação de chuveiro",
      description: "Instalação de chuveiro elétrico",
      fixedPrice: 150.0,
      categoryId: "cat-1",
      isActive: true,
      providerProfile: { userId: "provider-1" },
      category: { id: "cat-1", name: "Elétrica", slug: "eletrica" },
    };

    const hiredOrder = {
      id: "order-hired",
      clientId: "client-1",
      providerId: "provider-1",
      providerServiceId: "service-1",
      agreedPrice: 150.0,
      title: "Instalação de chuveiro",
      description: "Instalação de chuveiro elétrico",
      categoryId: "cat-1",
      budgetMin: null,
      budgetMax: null,
      address: {},
      status: "IN_PROGRESS",
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: "cat-1", name: "Elétrica", slug: "eletrica" },
    };

    it("should hire a provider service and create IN_PROGRESS order", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue(mockProviderService);
      mockPrisma.serviceOrder.create.mockResolvedValue(hiredOrder);

      const result = await service.hireFromProvider("client-1", hireDto, "127.0.0.1");

      expect(result.status).toBe("IN_PROGRESS");
      expect(result.provider_id).toBe("provider-1");
      expect(result.provider_service_id).toBe("service-1");
      expect(result.agreed_price).toBe(150.0);
      expect(mockPrisma.serviceOrder.create).toHaveBeenCalledWith({
        data: {
          clientId: "client-1",
          providerId: "provider-1",
          providerServiceId: "service-1",
          agreedPrice: 150.0,
          title: "Instalação de chuveiro",
          description: "Instalação de chuveiro elétrico",
          categoryId: "cat-1",
          status: "IN_PROGRESS",
        },
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
    });

    it("should throw NotFoundException when provider service not found", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue(null);

      await expect(
        service.hireFromProvider("client-1", hireDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when service is not active", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue({
        ...mockProviderService,
        isActive: false,
      });

      await expect(
        service.hireFromProvider("client-1", hireDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when hiring own service", async () => {
      mockPrisma.providerService.findUnique.mockResolvedValue({
        ...mockProviderService,
        providerProfile: { userId: "client-1" },
      });

      await expect(
        service.hireFromProvider("client-1", hireDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

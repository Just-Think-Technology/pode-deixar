import { Test, TestingModule } from "@nestjs/testing";
import { ServiceOrdersService } from "../src/service-orders/service-orders.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { ServicesLoggerService } from "../src/shared/services-logger.service";
import {
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

describe("ServiceOrdersService", () => {
  let service: ServiceOrdersService;

  const mockOrder = {
    id: "order-1",
    clientId: "client-1",
    title: "Preciso de um encanador",
    description: "Vazamento no chuveiro",
    categoryId: "cat-1",
    budgetMin: 50,
    budgetMax: 200,
    address: {},
    status: "OPEN",
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: "cat-1", name: "Hidráulica", slug: "hidraulica" },
  };

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

  const mockPrisma = {
    serviceOrder: {
      findUnique: jest.fn(),
    },
  };

  const mockLogger = {
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    logServiceOrderCreated: jest.fn(),
    logServiceOrderUpdated: jest.fn(),
    logServiceOrderCancelled: jest.fn(),
    logProposalCreated: jest.fn(),
    logProposalUpdated: jest.fn(),
    logProposalWithdrawn: jest.fn(),
    logProposalAccepted: jest.fn(),
    logSecurityEvent: jest.fn(),
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

  describe("findByIdForClient", () => {
    it("should return order with proposals when client is the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        proposals: mockProposals,
      });

      const result = await service.findByIdForClient("order-1", "client-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.client_id).toBe("client-1");
      expect(result.proposals).toHaveLength(2);
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
        proposals: mockProposals,
      });

      await expect(
        service.findByIdForClient("order-1", "client-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("findByIdWithAccess", () => {
    it("should return full order with all proposals when CLIENT is the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "client-1",
        proposals: mockProposals,
      });

      const result = await service.findByIdWithAccess(
        "order-1",
        "client-1",
        "CLIENT",
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.proposals).toHaveLength(2);
    });

    it("should return order with only own proposal when PROVIDER has a proposal", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        proposals: mockProposals,
      });

      const result = await service.findByIdWithAccess(
        "order-1",
        "provider-1",
        "PROVIDER",
      );

      expect(result).toBeDefined();
      expect(result.id).toBe("order-1");
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].provider_id).toBe("provider-1");
    });

    it("should throw ForbiddenException when PROVIDER has no proposal on this order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        proposals: mockProposals,
      });

      await expect(
        service.findByIdWithAccess("order-1", "provider-3", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when CLIENT is not the owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        clientId: "other-client",
        proposals: mockProposals,
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
});

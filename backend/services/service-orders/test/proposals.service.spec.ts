import { Test, TestingModule } from "@nestjs/testing";
import { ProposalsService } from "../src/proposals/proposals.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { ServicesLoggerService } from "../src/shared/services-logger.service";
import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

describe("ProposalsService", () => {
  let service: ProposalsService;

  const mockProposal = {
    id: "proposal-1",
    serviceOrderId: "order-1",
    providerId: "provider-1",
    price: 150.0,
    description: "Posso realizar o serviço",
    estimatedDuration: "2 horas",
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockServiceOrder = {
    id: "order-1",
    clientId: "client-1",
    title: "Test Order",
    description: "Test order description",
    status: "OPEN",
    category: { id: "cat-1", name: "Hidráulica", slug: "hidraulica" },
  };

  const mockProposalWithOrder = {
    ...mockProposal,
    serviceOrder: mockServiceOrder,
  };

  const mockPrisma = {
    proposal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    serviceOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLogger = {
    logProposalCreated: jest.fn(),
    logProposalUpdated: jest.fn(),
    logProposalWithdrawn: jest.fn(),
    logProposalAccepted: jest.fn(),
    logInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServicesLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ProposalsService>(ProposalsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const dto = {
      serviceOrderId: "order-1",
      price: 150.0,
      description: "Posso realizar o serviço",
      estimatedDuration: "2 horas",
    };

    it("should create a proposal", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockServiceOrder);
      mockPrisma.proposal.findFirst.mockResolvedValue(null);
      mockPrisma.proposal.create.mockResolvedValue(mockProposal);

      const result = await service.create("provider-1", dto, "127.0.0.1");

      expect(result.service_order_id).toBe("order-1");
      expect(result.provider_id).toBe("provider-1");
      expect(mockLogger.logProposalCreated).toHaveBeenCalledWith(
        "provider-1",
        "proposal-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when service order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.create("provider-1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...mockServiceOrder,
        status: "IN_PROGRESS",
      });

      await expect(service.create("provider-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when provider is the order owner", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockServiceOrder);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when provider already has active proposal", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockServiceOrder);
      mockPrisma.proposal.findFirst.mockResolvedValue(mockProposal);

      await expect(service.create("provider-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findByIdForProvider", () => {
    it("should return proposal with service_order detail", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposalWithOrder);

      const result: any = await service.findByIdForProvider("proposal-1", "provider-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("proposal-1");
      expect(result.service_order).toBeDefined();
      expect(result.service_order.id).toBe("order-1");
      expect(result.service_order.title).toBe("Test Order");
      expect(result.service_order.category.name).toBe("Hidráulica");
    });

    it("should throw NotFoundException when proposal does not exist", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIdForProvider("invalid-id", "provider-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when provider does not own the proposal", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposalWithOrder,
        providerId: "other-provider",
      });

      await expect(
        service.findByIdForProvider("proposal-1", "provider-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByProvider", () => {
    it("should return proposals with service_order summary", async () => {
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposalWithOrder]);

      const result: any[] = await service.findByProvider("provider-1");

      expect(result).toHaveLength(1);
      expect(result[0].provider_id).toBe("provider-1");
      expect(result[0].service_order).toBeDefined();
      expect(result[0].service_order.title).toBe("Test Order");
    });
  });

  describe("findByServiceOrder", () => {
    it("should return proposals for a service order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(mockServiceOrder);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      const result = await service.findByServiceOrder("order-1");

      expect(result).toHaveLength(1);
      expect(result[0].service_order_id).toBe("order-1");
    });

    it("should throw NotFoundException when order not found", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.findByServiceOrder("nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a proposal", async () => {
      const updateDto = { price: 200.0 };
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.update.mockResolvedValue({
        ...mockProposal,
        price: 200.0,
      });

      const result = await service.update("provider-1", "proposal-1", updateDto);

      expect(result.price).toBe(200.0);
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.update("provider-1", "nonexistent", {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when not the owner", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.update("other-provider", "proposal-1", {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        status: "ACCEPTED",
      });

      await expect(
        service.update("provider-1", "proposal-1", {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("withdraw", () => {
    it("should withdraw a proposal", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.update.mockResolvedValue({
        ...mockProposal,
        status: "WITHDRAWN",
      });

      const result = await service.withdraw("provider-1", "proposal-1");

      expect(result.status).toBe("WITHDRAWN");
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw("provider-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when not the owner", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.withdraw("other-provider", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        status: "ACCEPTED",
      });

      await expect(
        service.withdraw("provider-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("accept", () => {
    it("should accept a proposal and update order to IN_PROGRESS", async () => {
      const updatedProposal = { ...mockProposal, status: "ACCEPTED" };
      const fullProposal = {
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, status: "OPEN" },
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(fullProposal);
      mockPrisma.$transaction.mockResolvedValue([updatedProposal]);

      const result = await service.accept("client-1", "proposal-1", "127.0.0.1");

      expect(result.status).toBe("ACCEPTED");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockLogger.logProposalAccepted).toHaveBeenCalledWith(
        "order-1",
        "proposal-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.accept("client-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when client does not own the order", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, clientId: "other-client" },
      });

      await expect(
        service.accept("client-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, status: "IN_PROGRESS" },
      });

      await expect(
        service.accept("client-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        status: "REJECTED",
        serviceOrder: { ...mockServiceOrder, status: "OPEN" },
      });

      await expect(
        service.accept("client-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject other pending proposals in the same order", async () => {
      const fullProposal = {
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, status: "OPEN" },
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(fullProposal);
      mockPrisma.proposal.update.mockReturnThis();
      mockPrisma.proposal.updateMany.mockReturnThis();
      mockPrisma.serviceOrder.update.mockReturnThis();
      mockPrisma.$transaction.mockResolvedValue([
        { ...mockProposal, status: "ACCEPTED" },
      ]);

      await service.accept("client-1", "proposal-1");

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: "proposal-1" },
        data: { status: "ACCEPTED" },
      });
      expect(mockPrisma.proposal.updateMany).toHaveBeenCalledWith({
        where: {
          serviceOrderId: "order-1",
          id: { not: "proposal-1" },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "IN_PROGRESS" },
      });
    });
  });

  describe("reject", () => {
    it("should reject a proposal", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockPrisma.proposal.update.mockResolvedValue({
        ...mockProposal,
        status: "REJECTED",
      });

      const result = await service.reject("client-1", "proposal-1");

      expect(result.status).toBe("REJECTED");
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.reject("client-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when client does not own the order", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, clientId: "other-client" },
      });

      await expect(
        service.reject("client-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        status: "ACCEPTED",
        serviceOrder: { ...mockServiceOrder },
      });

      await expect(
        service.reject("client-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

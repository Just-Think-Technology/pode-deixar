import { Test, TestingModule } from "@nestjs/testing";
import { CounterProposalsService } from "../src/counter-proposals/counter-proposals.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { ServicesLoggerService } from "../src/shared/services-logger.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

describe("CounterProposalsService", () => {
  let service: CounterProposalsService;

  const mockProposal = {
    id: "proposal-1",
    serviceOrderId: "order-1",
    providerId: "provider-1",
    price: 150.0,
    status: "PENDING",
  };

  const mockServiceOrder = {
    id: "order-1",
    clientId: "client-1",
    status: "OPEN",
  };

  const mockCounterProposal = {
    id: "cp-1",
    proposalId: "proposal-1",
    senderId: "client-1",
    price: 180.0,
    description: "Contraproposta do cliente",
    estimatedDuration: "3 dias",
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    counterProposal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    proposal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    serviceOrder: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLogger = {
    logInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterProposalsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServicesLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CounterProposalsService>(CounterProposalsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const dto = {
      proposalId: "proposal-1",
      price: 180.0,
      description: "Contraproposta do cliente",
      estimatedDuration: "3 dias",
    };

    it("should create a counter-proposal as client", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockPrisma.counterProposal.findFirst.mockResolvedValue(null);
      mockPrisma.counterProposal.create.mockResolvedValue(mockCounterProposal);

      const result = await service.create("client-1", dto, "127.0.0.1");

      expect(result.proposal_id).toBe("proposal-1");
      expect(result.sender_id).toBe("client-1");
      expect(result.price).toBe(180.0);
    });

    it("should create a counter-proposal as provider", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockPrisma.counterProposal.findFirst.mockResolvedValue(null);
      mockPrisma.counterProposal.create.mockResolvedValue({
        ...mockCounterProposal,
        senderId: "provider-1",
      });

      const result = await service.create("provider-1", dto);

      expect(result.sender_id).toBe("provider-1");
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        status: "ACCEPTED",
        serviceOrder: { ...mockServiceOrder },
      });

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException when sender is not related", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });

      await expect(service.create("stranger", dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw BadRequestException when sender has pending counter-proposal", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockPrisma.counterProposal.findFirst.mockResolvedValue(mockCounterProposal);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("accept", () => {
    it("should accept a counter-proposal and finalize deal", async () => {
      const fullCp = {
        ...mockCounterProposal,
        proposal: {
          ...mockProposal,
          serviceOrder: { ...mockServiceOrder, status: "OPEN" },
        },
      };
      mockPrisma.counterProposal.findUnique.mockResolvedValue(fullCp);
      mockPrisma.$transaction.mockResolvedValue([
        { ...mockCounterProposal, status: "ACCEPTED" },
      ]);

      const result = await service.accept("provider-1", "cp-1", "127.0.0.1");

      expect(result.status).toBe("ACCEPTED");
    });

    it("should throw NotFoundException when counter-proposal not found", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue(null);

      await expect(service.accept("provider-1", "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when counter-proposal is not PENDING", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue({
        ...mockCounterProposal,
        status: "REJECTED",
        proposal: { ...mockProposal, serviceOrder: { ...mockServiceOrder } },
      });

      await expect(service.accept("provider-1", "cp-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when accepting own counter-proposal", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue({
        ...mockCounterProposal,
        senderId: "client-1",
        proposal: { ...mockProposal, serviceOrder: { ...mockServiceOrder } },
      });

      await expect(service.accept("client-1", "cp-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue({
        ...mockCounterProposal,
        proposal: {
          ...mockProposal,
          serviceOrder: { ...mockServiceOrder, status: "IN_PROGRESS" },
        },
      });

      await expect(service.accept("provider-1", "cp-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject other pending counter-proposals in the same proposal", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue({
        ...mockCounterProposal,
        proposal: {
          ...mockProposal,
          serviceOrder: { ...mockServiceOrder, status: "OPEN" },
        },
      });
      mockPrisma.counterProposal.update.mockReturnThis();
      mockPrisma.proposal.update.mockReturnThis();
      mockPrisma.proposal.updateMany.mockReturnThis();
      mockPrisma.counterProposal.updateMany.mockReturnThis();
      mockPrisma.serviceOrder.update.mockReturnThis();
      mockPrisma.$transaction.mockResolvedValue([
        { ...mockCounterProposal, status: "ACCEPTED" },
      ]);

      await service.accept("provider-1", "cp-1");

      expect(mockPrisma.counterProposal.update).toHaveBeenCalledWith({
        where: { id: "cp-1" },
        data: { status: "ACCEPTED" },
      });
      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: "proposal-1" },
        data: { status: "ACCEPTED" },
      });
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "IN_PROGRESS" },
      });
    });
  });

  describe("reject", () => {
    it("should reject a counter-proposal", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue({
        ...mockCounterProposal,
        proposal: { ...mockProposal, serviceOrder: { ...mockServiceOrder } },
      });
      mockPrisma.counterProposal.update.mockResolvedValue({
        ...mockCounterProposal,
        status: "REJECTED",
      });

      const result = await service.reject("provider-1", "cp-1");

      expect(result.status).toBe("REJECTED");
    });

    it("should throw NotFoundException when counter-proposal not found", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue(null);

      await expect(service.reject("provider-1", "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when rejecting own counter-proposal", async () => {
      mockPrisma.counterProposal.findUnique.mockResolvedValue({
        ...mockCounterProposal,
        proposal: { ...mockProposal, serviceOrder: { ...mockServiceOrder } },
      });

      await expect(service.reject("client-1", "cp-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findByProposal", () => {
    it("should return counter-proposals for a proposal as client", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockPrisma.counterProposal.findMany.mockResolvedValue([
        mockCounterProposal,
      ]);

      const result = await service.findByProposal("client-1", "proposal-1");

      expect(result).toHaveLength(1);
      expect(result[0].proposal_id).toBe("proposal-1");
    });

    it("should return counter-proposals for a proposal as provider", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockPrisma.counterProposal.findMany.mockResolvedValue([
        mockCounterProposal,
      ]);

      const result = await service.findByProposal("provider-1", "proposal-1");

      expect(result).toHaveLength(1);
    });

    it("should throw ForbiddenException when user is unrelated", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });

      await expect(
        service.findByProposal("stranger", "proposal-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.findByProposal("client-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findMySent", () => {
    it("should return counter-proposals sent by user", async () => {
      mockPrisma.counterProposal.findMany.mockResolvedValue([
        {
          ...mockCounterProposal,
          proposal: { id: "proposal-1", serviceOrderId: "order-1", price: 150.0, status: "PENDING" },
        },
      ]);

      const result = await service.findMySent("client-1");

      expect(result).toHaveLength(1);
      expect(result[0].sender_id).toBe("client-1");
      expect(result[0].proposal).toBeDefined();
    });
  });
});

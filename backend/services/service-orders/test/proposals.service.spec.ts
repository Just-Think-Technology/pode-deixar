import { Test, TestingModule } from "@nestjs/testing";
import { ProposalsService } from "../src/proposals/proposals.service";
import { ProposalsRepository } from "../src/proposals/proposals.repository";
import { ServicesLoggerService } from "../src/shared/services-logger.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
    providerId: null,
    category: { id: "cat-1", name: "Hidráulica", slug: "hidraulica" },
  };

  const mockProposalWithOrder = {
    ...mockProposal,
    serviceOrder: mockServiceOrder,
  };

  const mockServiceOrderWithProvider = {
    id: "order-2",
    clientId: "client-1",
    title: "Directed Order",
    status: "OPEN",
    providerId: "provider-2",
  };

  const mockRepository = {
    findOrderById: jest.fn(),
    findActiveProposal: jest.fn(),
    createProposal: jest.fn(),
    findProposalWithOrderById: jest.fn(),
    findProposalsByProvider: jest.fn(),
    findProposalsByOrder: jest.fn(),
    findProposalById: jest.fn(),
    updateProposal: jest.fn(),
    updateProposalStatus: jest.fn(),
    findProposalWithServiceOrder: jest.fn(),
    acceptProposal: jest.fn(),
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
        { provide: ProposalsRepository, useValue: mockRepository },
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
      mockRepository.findOrderById.mockResolvedValue(mockServiceOrder);
      mockRepository.findActiveProposal.mockResolvedValue(null);
      mockRepository.createProposal.mockResolvedValue(mockProposal);

      const result = await service.create("provider-1", dto, "127.0.0.1");

      expect(result.service_order_id).toBe("order-1");
      expect(result.provider_id).toBe("provider-1");
      expect(mockRepository.createProposal).toHaveBeenCalledWith({
        serviceOrderId: "order-1",
        providerId: "provider-1",
        price: 150.0,
        description: "Posso realizar o serviço",
        estimatedDuration: "2 horas",
      });
      expect(mockLogger.logProposalCreated).toHaveBeenCalledWith(
        "provider-1",
        "proposal-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when service order not found", async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(service.create("provider-1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockRepository.findOrderById.mockResolvedValue({
        ...mockServiceOrder,
        status: "IN_PROGRESS",
      });

      await expect(service.create("provider-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when provider is the order owner", async () => {
      mockRepository.findOrderById.mockResolvedValue(mockServiceOrder);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when provider already has active proposal", async () => {
      mockRepository.findOrderById.mockResolvedValue(mockServiceOrder);
      mockRepository.findActiveProposal.mockResolvedValue(mockProposal);

      await expect(service.create("provider-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException when order is directed to another provider", async () => {
      mockRepository.findOrderById.mockResolvedValue(
        mockServiceOrderWithProvider,
      );

      await expect(
        service.create("provider-1", { ...dto, serviceOrderId: "order-2" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should create a proposal when order is directed to this provider", async () => {
      mockRepository.findOrderById.mockResolvedValue(
        mockServiceOrderWithProvider,
      );
      mockRepository.findActiveProposal.mockResolvedValue(null);
      mockRepository.createProposal.mockResolvedValue({
        ...mockProposal,
        providerId: "provider-2",
        serviceOrderId: "order-2",
      });

      const result = await service.create("provider-2", {
        ...dto,
        serviceOrderId: "order-2",
      });

      expect(result).toBeDefined();
      expect(result.provider_id).toBe("provider-2");
    });
  });

  describe("findByIdForProvider", () => {
    it("should return proposal with service_order detail", async () => {
      mockRepository.findProposalWithOrderById.mockResolvedValue(mockProposalWithOrder);

      const result: any = await service.findByIdForProvider("proposal-1", "provider-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("proposal-1");
      expect(result.service_order).toBeDefined();
      expect(result.service_order.id).toBe("order-1");
      expect(result.service_order.title).toBe("Test Order");
      expect(result.service_order.category.name).toBe("Hidráulica");
    });

    it("should throw NotFoundException when proposal does not exist", async () => {
      mockRepository.findProposalWithOrderById.mockResolvedValue(null);

      await expect(
        service.findByIdForProvider("invalid-id", "provider-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when provider does not own the proposal", async () => {
      mockRepository.findProposalWithOrderById.mockResolvedValue({
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
      mockRepository.findProposalsByProvider.mockResolvedValue([mockProposalWithOrder]);

      const result: any[] = await service.findByProvider("provider-1");

      expect(result).toHaveLength(1);
      expect(result[0].provider_id).toBe("provider-1");
      expect(result[0].service_order).toBeDefined();
      expect(result[0].service_order.title).toBe("Test Order");
      expect(mockRepository.findProposalsByProvider).toHaveBeenCalledWith(
        "provider-1",
        0,
        20,
      );
    });
  });

  describe("findByServiceOrder", () => {
    it("should return proposals for a service order", async () => {
      mockRepository.findOrderById.mockResolvedValue(mockServiceOrder);
      mockRepository.findProposalsByOrder.mockResolvedValue([mockProposal]);

      const result = await service.findByServiceOrder("order-1");

      expect(result).toHaveLength(1);
      expect(result[0].service_order_id).toBe("order-1");
      expect(mockRepository.findProposalsByOrder).toHaveBeenCalledWith(
        "order-1",
      );
    });

    it("should throw NotFoundException when order not found", async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(
        service.findByServiceOrder("nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a proposal", async () => {
      const updateDto = { price: 200.0 };
      mockRepository.findProposalById.mockResolvedValue(mockProposal);
      mockRepository.updateProposal.mockResolvedValue({
        ...mockProposal,
        price: 200.0,
      });

      const result = await service.update("provider-1", "proposal-1", updateDto);

      expect(result.price).toBe(200.0);
      expect(mockRepository.updateProposal).toHaveBeenCalledWith(
        "proposal-1",
        {
          price: 200.0,
          description: "Posso realizar o serviço",
          estimatedDuration: "2 horas",
        },
      );
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockRepository.findProposalById.mockResolvedValue(null);

      await expect(
        service.update("provider-1", "nonexistent", {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when not the owner", async () => {
      mockRepository.findProposalById.mockResolvedValue(mockProposal);

      await expect(
        service.update("other-provider", "proposal-1", {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockRepository.findProposalById.mockResolvedValue({
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
      mockRepository.findProposalById.mockResolvedValue(mockProposal);
      mockRepository.updateProposalStatus.mockResolvedValue({
        ...mockProposal,
        status: "WITHDRAWN",
      });

      const result = await service.withdraw("provider-1", "proposal-1");

      expect(result.status).toBe("WITHDRAWN");
      expect(mockRepository.updateProposalStatus).toHaveBeenCalledWith(
        "proposal-1",
        "WITHDRAWN",
      );
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockRepository.findProposalById.mockResolvedValue(null);

      await expect(
        service.withdraw("provider-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when not the owner", async () => {
      mockRepository.findProposalById.mockResolvedValue(mockProposal);

      await expect(
        service.withdraw("other-provider", "proposal-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockRepository.findProposalById.mockResolvedValue({
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
      mockRepository.findProposalWithServiceOrder.mockResolvedValue(fullProposal);
      mockRepository.acceptProposal.mockResolvedValue([updatedProposal]);

      const result = await service.accept("client-1", "proposal-1", "127.0.0.1");

      expect(result.status).toBe("ACCEPTED");
      expect(mockRepository.acceptProposal).toHaveBeenCalledWith(
        "proposal-1",
        "order-1",
        "provider-1",
        150,
      );
      expect(mockLogger.logProposalAccepted).toHaveBeenCalledWith(
        "order-1",
        "proposal-1",
        "127.0.0.1",
      );
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue(null);

      await expect(
        service.accept("client-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when client does not own the order", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, clientId: "other-client" },
      });

      await expect(
        service.accept("client-1", "proposal-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when order is not OPEN", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, status: "IN_PROGRESS" },
      });

      await expect(
        service.accept("client-1", "proposal-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue({
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
      mockRepository.findProposalWithServiceOrder.mockResolvedValue(fullProposal);
      mockRepository.acceptProposal.mockResolvedValue([
        { ...mockProposal, status: "ACCEPTED" },
      ]);

      await service.accept("client-1", "proposal-1");

      expect(mockRepository.acceptProposal).toHaveBeenCalledWith(
        "proposal-1",
        "order-1",
        "provider-1",
        150,
      );
    });
  });

  describe("reject", () => {
    it("should reject a proposal", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder },
      });
      mockRepository.updateProposalStatus.mockResolvedValue({
        ...mockProposal,
        status: "REJECTED",
      });

      const result = await service.reject("client-1", "proposal-1");

      expect(result.status).toBe("REJECTED");
      expect(mockRepository.updateProposalStatus).toHaveBeenCalledWith(
        "proposal-1",
        "REJECTED",
      );
    });

    it("should throw NotFoundException when proposal not found", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue(null);

      await expect(
        service.reject("client-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when client does not own the order", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue({
        ...mockProposal,
        serviceOrder: { ...mockServiceOrder, clientId: "other-client" },
      });

      await expect(
        service.reject("client-1", "proposal-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when proposal is not PENDING", async () => {
      mockRepository.findProposalWithServiceOrder.mockResolvedValue({
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

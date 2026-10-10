// Directed-order ownership tests — losing bidder must not reach another provider's data

import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { ServiceOrdersService } from "../src/service-orders/service-orders.service";
import { ServiceOrdersRepository } from "../src/service-orders/service-orders.repository";
import { ServicesLoggerService } from "../src/shared/services-logger.service";

describe("Directed order ownership", () => {
  let service: ServiceOrdersService;

  const mockRepository: any = {
    findOrderTrackingById: jest.fn(),
    findOrderWithAccessById: jest.fn(),
    findPhotosByOrderId: jest.fn().mockResolvedValue([]),
    findUserById: jest.fn(),
  };

  const mockLogger: any = {
    logServiceOrderCreated: jest.fn(),
    logServiceOrderUpdated: jest.fn(),
    logServiceOrderCancelled: jest.fn(),
    logServiceOrderCompleted: jest.fn(),
    logInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: ServiceOrdersRepository, useValue: mockRepository },
        { provide: ServicesLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
    jest.clearAllMocks();
  });

  // Order accepted by provider-b; provider-a keeps a REJECTED proposal row.
  function makeDirectedOrder(overrides: any = {}) {
    return {
      id: "order-1",
      clientId: "client-1",
      providerId: "provider-b",
      agreedPrice: 180,
      title: "Troca de torneira",
      description: "Vazamento na cozinha",
      categoryId: "cat-1",
      category: { id: "cat-1", name: "Hidráulica", slug: "hidraulica" },
      status: "COMPLETED",
      address: {
        street: "Rua Augusta",
        number: "500",
        neighborhood: "Consolação",
        city: "São Paulo",
        state: "SP",
        postalCode: "01305-000",
      },
      scheduledAt: new Date("2026-09-20T10:00:00.000Z"),
      scheduledEndAt: new Date("2026-09-20T12:00:00.000Z"),
      startedAt: new Date("2026-09-20T10:05:00.000Z"),
      completedAt: new Date("2026-09-20T11:00:00.000Z"),
      completedBy: "provider-b",
      observations: "Serviço concluído por provider-b",
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date("2026-09-15T10:00:00.000Z"),
      updatedAt: new Date("2026-09-20T11:00:00.000Z"),
      proposals: [
        {
          id: "proposal-b",
          providerId: "provider-b",
          price: 180,
          description: "Preço do vencedor",
          estimatedDuration: "2 horas",
          status: "ACCEPTED",
          createdAt: new Date("2026-09-14T10:00:00.000Z"),
          updatedAt: new Date("2026-09-14T10:00:00.000Z"),
        },
        {
          id: "proposal-a",
          providerId: "provider-a",
          price: 90,
          description: "Proposta perdedora",
          estimatedDuration: "1 hora",
          status: "REJECTED",
          createdAt: new Date("2026-09-14T09:00:00.000Z"),
          updatedAt: new Date("2026-09-14T11:00:00.000Z"),
        },
      ],
      photos: [{ id: "photo-1", url: "http://storage/order-1/photo-1.webp", createdAt: new Date() }],
      payments: [
        {
          id: "payment-1",
          status: "PAID",
          method: "PIX",
          amount: 180,
          paidAt: new Date("2026-09-14T12:00:00.000Z"),
          createdAt: new Date("2026-09-14T12:00:00.000Z"),
        },
      ],
      reviews: [],
      timelineEvents: [],
      ...overrides,
    };
  }

  describe("getTracking", () => {
    it("rejects a losing bidder on an order directed to another provider", async () => {
      mockRepository.findOrderTrackingById.mockResolvedValue(makeDirectedOrder());

      await expect(
        service.getTracking("order-1", "provider-a", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects a withdrawn bidder on a directed order", async () => {
      mockRepository.findOrderTrackingById.mockResolvedValue(
        makeDirectedOrder({
          proposals: [
            makeDirectedOrder().proposals[0],
            { ...makeDirectedOrder().proposals[1], status: "WITHDRAWN" },
          ],
        }),
      );

      await expect(
        service.getTracking("order-1", "provider-a", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("still allows the assigned provider", async () => {
      mockRepository.findOrderTrackingById.mockResolvedValue(makeDirectedOrder());
      mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

      const result = await service.getTracking("order-1", "provider-b", "PROVIDER");

      expect(result.orderId).toBe("order-1");
      expect(result.counterpart.completeName).toBe("Ana Costa");
    });

    it("rejects a provider without any proposal on a directed order", async () => {
      mockRepository.findOrderTrackingById.mockResolvedValue(
        makeDirectedOrder({ proposals: [makeDirectedOrder().proposals[0]] }),
      );

      await expect(
        service.getTracking("order-1", "provider-c", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("keeps a PENDING proposal visible on an open marketplace order", async () => {
      mockRepository.findOrderTrackingById.mockResolvedValue(
        makeDirectedOrder({
          providerId: null,
          status: "OPEN",
          proposals: [
            { ...makeDirectedOrder().proposals[0], providerId: "provider-a", status: "PENDING" },
          ],
        }),
      );
      mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

      const result = await service.getTracking("order-1", "provider-a", "PROVIDER");

      expect(result.orderId).toBe("order-1");
    });
  });

  describe("getCompletion", () => {
    it("rejects a losing bidder on a directed order", async () => {
      mockRepository.findOrderWithAccessById.mockResolvedValue(makeDirectedOrder());

      await expect(
        service.getCompletionHistory("order-1", "provider-a", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejects a provider with no proposal on a directed order", async () => {
      mockRepository.findOrderWithAccessById.mockResolvedValue(
        makeDirectedOrder({ proposals: [makeDirectedOrder().proposals[0]] }),
      );

      await expect(
        service.getCompletionHistory("order-1", "provider-c", "PROVIDER"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("still allows the assigned provider", async () => {
      mockRepository.findOrderWithAccessById.mockResolvedValue(makeDirectedOrder());

      const result = await service.getCompletionHistory("order-1", "provider-b", "PROVIDER");

      expect(result).toBeDefined();
    });
  });
});
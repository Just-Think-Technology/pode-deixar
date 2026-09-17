// Tracking builder tests — JTT-105 Task 2

import { Test, TestingModule } from "@nestjs/testing";
import { ServiceOrdersService } from "../src/service-orders/service-orders.service";
import { ServiceOrdersRepository } from "../src/service-orders/service-orders.repository";
import { ServicesLoggerService } from "../src/shared/services-logger.service";

describe("ServiceOrdersService.getTracking", () => {
  let service: ServiceOrdersService;

  const mockRepository: any = {
    findOrderTrackingById: jest.fn(),
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

  function makeTrackingOrder(overrides: any = {}) {
    return {
      id: "order-1",
      clientId: "client-1",
      providerId: "provider-1",
      agreedPrice: 180,
      title: "Troca",
      description: "Troca da torneira",
      categoryId: "cat-1",
      category: { id: "cat-1", name: "Hidráulica", slug: "hidraulica" },
      status: "IN_PROGRESS",
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
      completedAt: null,
      completedBy: null,
      observations: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date("2026-09-15T10:00:00.000Z"),
      updatedAt: new Date("2026-09-15T10:00:00.000Z"),
      proposals: [
        {
          id: "proposal-1",
          providerId: "provider-1",
          price: 180,
          description: "Posso realizar o serviço",
          estimatedDuration: "2 horas",
          status: "ACCEPTED",
          createdAt: new Date("2026-09-14T10:00:00.000Z"),
          updatedAt: new Date("2026-09-14T10:00:00.000Z"),
        },
      ],
      photos: [{ id: "photo-1", url: "http://minio/photo-1.webp", createdAt: new Date() }],
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

  it("returns consolidated tracking for provider with feeAmount visible", async () => {
    mockRepository.findOrderTrackingById.mockResolvedValue(makeTrackingOrder());
    mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

    const asProvider = await service.getTracking("order-1", "provider-1", "PROVIDER");

    expect(asProvider.orderId).toBe("order-1");
    expect(asProvider.grossAmount).toBe(180);
    expect(asProvider.feeAmount).toBe(18);
    expect(asProvider.netAmount).toBe(162);
    expect(asProvider.role).toBe("PROVIDER");
    expect(asProvider.counterpart.completeName).toBe("Ana Costa");
    expect(asProvider.proposal).toBeDefined();
    expect(asProvider.payment.status).toBe("PAID");
  });

  it("omits feeAmount and netAmount for CLIENT (AppSec redaction)", async () => {
    mockRepository.findOrderTrackingById.mockResolvedValue(makeTrackingOrder());
    mockRepository.findUserById.mockResolvedValue({ id: "provider-1", completeName: "Carlos Silva" });

    const asClient = await service.getTracking("order-1", "client-1", "CLIENT");

    expect(asClient.grossAmount).toBe(180);
    expect(asClient.feeAmount).toBeUndefined();
    expect(asClient.netAmount).toBeUndefined();
    expect(asClient.role).toBe("CLIENT");
    // Ensure not serialized as null either — must be undefined
    expect("feeAmount" in asClient ? asClient.feeAmount : undefined).toBeUndefined();
  });
});

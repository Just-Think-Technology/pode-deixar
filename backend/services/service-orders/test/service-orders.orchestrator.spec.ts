// ServiceOrdersService orchestrator tests — verifies deep modules via interface

import { Test, TestingModule } from "@nestjs/testing";
import { ServiceOrdersService } from "../src/service-orders/service-orders.service";
import { ServiceOrdersRepository } from "../src/service-orders/service-orders.repository";
import { ServicesLoggerService } from "../src/shared/services-logger.service";
import { OrderPricing } from "../src/service-orders/order-pricing.service";
import { OrderTrackingAssembler } from "../src/service-orders/order-tracking-assembler.service";
import { OrderPhotoPipeline } from "../src/service-orders/order-photo-pipeline.service";

describe("ServiceOrdersService as thin orchestrator", () => {
  let service: ServiceOrdersService;

  const mockRepository: any = {
    findOrderTrackingById: jest.fn(),
    findUserById: jest.fn(),
    findOrderById: jest.fn(),
    countPhotosByOrderId: jest.fn(),
    completeOrder: jest.fn(),
    createTimelineEvent: jest.fn(),
    createCompletionNotification: jest.fn(),
    findOrderWithAccessById: jest.fn(),
    findOrderWithProposalsById: jest.fn(),
    findByClient: jest.fn(),
    findReceivedByProvider: jest.fn(),
    findOpenOrders: jest.fn(),
    findProviderAgenda: jest.fn(),
  };

  const mockLogger: any = {
    logServiceOrderCreated: jest.fn(),
    logServiceOrderUpdated: jest.fn(),
    logServiceOrderCancelled: jest.fn(),
    logServiceOrderCompleted: jest.fn(),
    logInfo: jest.fn(),
  };

  const mockPricing: any = {
    toNumber: jest.fn((v: any) => (typeof v === "number" ? v : null)),
    buildPricing: jest.fn(() => ({ grossAmount: 100, feeAmount: 10, netAmount: 90 })),
  };

  const mockAssembler: any = {
    assemble: jest.fn(async (order: any) => ({ mocked: true, orderId: order.id })),
    toContractTracking: jest.fn(async (order: any) => ({ mocked: true, orderId: order.id })),
  };

  const mockPipeline: any = {
    handleUpload: jest.fn(async () => ({ uploadedCount: 1, photos: [{ id: "p1" }] })),
    processFiles: jest.fn(async () => [Buffer.from("webp")]),
    uploadPhotos: jest.fn(async () => [{ id: "p1" }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: ServiceOrdersRepository, useValue: mockRepository },
        { provide: ServicesLoggerService, useValue: mockLogger },
        { provide: OrderPricing, useValue: mockPricing },
        { provide: OrderTrackingAssembler, useValue: mockAssembler },
        { provide: OrderPhotoPipeline, useValue: mockPipeline },
      ],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
    jest.clearAllMocks();
  });

  it("delegates getTracking to OrderTrackingAssembler via interface", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      providerId: "provider-1",
      proposals: [{ providerId: "provider-1", status: "ACCEPTED" }],
    };
    mockRepository.findOrderTrackingById.mockResolvedValue(order);

    const result = await service.getTracking("order-1", "provider-1", "PROVIDER");

    expect(mockAssembler.assemble).toHaveBeenCalledWith(order, "provider-1", "PROVIDER");
    expect(result).toEqual({ mocked: true, orderId: "order-1" });
  });

  it("delegates finish photo handling to OrderPhotoPipeline via interface", async () => {
    const existing = {
      id: "order-1",
      clientId: "client-1",
      providerId: "provider-1",
      status: "IN_PROGRESS",
      startedAt: new Date(),
    };
    mockRepository.findOrderById.mockResolvedValue(existing);
    mockRepository.countPhotosByOrderId.mockResolvedValue(1);
    mockRepository.completeOrder.mockResolvedValue({
      ...existing,
      status: "COMPLETED",
      clientId: "client-1",
      id: "order-1",
    });
    // getTracking after finish will use assembler
    mockRepository.findOrderTrackingById.mockResolvedValue({
      id: "order-1",
      clientId: "client-1",
      providerId: "provider-1",
      proposals: [{ providerId: "provider-1", status: "ACCEPTED" }],
      status: "COMPLETED",
      photos: [],
      payments: [],
      reviews: [],
    });

    const files = [{ originalname: "photo.png", buffer: Buffer.from("x") }] as any;
    await service.finish("provider-1", "order-1", files, "obs", "127.0.0.1");

    expect(mockPipeline.handleUpload).toHaveBeenCalledWith("order-1", files);
    expect(mockRepository.completeOrder).toHaveBeenCalled();
  });

  it("maintains locality: mappers remain pure and pricing not needed for simple create", async () => {
    // Create does not need pricing/assembler/pipeline — orchestrator stays thin
    const mockCreateRepo: any = {
      findProviderUserById: jest.fn().mockResolvedValue(null),
      createOrder: jest.fn().mockResolvedValue({
        id: "order-2",
        clientId: "client-1",
        providerId: null,
        title: "t",
        description: "d",
        categoryId: "cat",
        budgetMin: null,
        budgetMax: null,
        address: null,
        status: "OPEN",
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      }),
      findOrderTrackingById: jest.fn(),
    };
    const module2: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: ServiceOrdersRepository, useValue: mockCreateRepo },
        { provide: ServicesLoggerService, useValue: mockLogger },
        { provide: OrderPricing, useValue: mockPricing },
        { provide: OrderTrackingAssembler, useValue: mockAssembler },
        { provide: OrderPhotoPipeline, useValue: mockPipeline },
      ],
    }).compile();
    const svc2 = module2.get<ServiceOrdersService>(ServiceOrdersService);
    const result: any = await svc2.create("client-1", { title: "t", description: "d", categoryId: "cat" } as any);
    expect(result.id).toBe("order-2");
    expect(mockPricing.buildPricing).not.toHaveBeenCalled();
  });
});

// OrderTrackingAssembler tests — deep module via interface

import { Test, TestingModule } from "@nestjs/testing";
import { OrderTrackingAssembler } from "../src/service-orders/order-tracking-assembler.service";
import { OrderPricing } from "../src/service-orders/order-pricing.service";
import { ServiceOrdersRepository } from "../src/service-orders/service-orders.repository";

describe("OrderTrackingAssembler", () => {
  let assembler: OrderTrackingAssembler;

  const mockRepository: any = {
    findUserById: jest.fn(),
  };

  const mockPricing: any = {
    buildPricing: jest.fn(),
    toNumber: jest.fn((v: unknown) => (typeof v === "number" ? v : null)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTrackingAssembler,
        { provide: ServiceOrdersRepository, useValue: mockRepository },
        { provide: OrderPricing, useValue: mockPricing },
      ],
    }).compile();

    assembler = module.get<OrderTrackingAssembler>(OrderTrackingAssembler);
    jest.clearAllMocks();
  });

  function makeOrder(overrides: any = {}) {
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
        },
      ],
      photos: [{ id: "photo-1", url: "http://minio/photo-1.webp" }],
      payments: [
        {
          id: "payment-1",
          status: "PAID",
          method: "PIX",
          amount: 180,
          paidAt: new Date("2026-09-14T12:00:00.000Z"),
        },
      ],
      reviews: [],
      timelineEvents: [],
      ...overrides,
    };
  }

  it("assembles tracking for PROVIDER with fees via pricing port", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: 180, feeAmount: 18, netAmount: 162 });
    mockPricing.toNumber.mockImplementation((v: any) => (typeof v === "number" ? v : null));
    mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

    const result = await assembler.assemble(makeOrder(), "provider-1", "PROVIDER");

    expect(result.orderId).toBe("order-1");
    expect(result.grossAmount).toBe(180);
    expect(result.feeAmount).toBe(18);
    expect(result.netAmount).toBe(162);
    expect(result.counterpart.completeName).toBe("Ana Costa");
    expect(result.proposal).toBeDefined();
    expect(result.payment.status).toBe("PAID");
    expect(mockPricing.buildPricing).toHaveBeenCalled();
  });

  it("redacts fees for CLIENT via interface", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: 180, feeAmount: 18, netAmount: 162 });
    mockRepository.findUserById.mockResolvedValue({ id: "provider-1", completeName: "Carlos Silva" });

    const result = await assembler.assemble(makeOrder(), "client-1", "CLIENT");

    expect(result.grossAmount).toBe(180);
    expect(result.feeAmount).toBeUndefined();
    expect(result.netAmount).toBeUndefined();
    expect(result.role).toBe("CLIENT");
  });

  it("falls back counterpart name when user not found", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: null, feeAmount: null, netAmount: null });
    mockRepository.findUserById.mockResolvedValue(null);

    const order = makeOrder({ providerId: null });
    const result = await assembler.assemble(order, "client-1", "CLIENT");

    expect(result.counterpart.completeName).toBe("Prestador");
  });

  it("exposes via OrderTrackingAssemblerPort interface (toContractTracking)", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: 100, feeAmount: 10, netAmount: 90 });
    mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana" });

    const viaInterface: any = assembler as any;
    expect(typeof viaInterface.toContractTracking).toBe("function");
    const result = await viaInterface.toContractTracking(makeOrder(), "provider-1", "PROVIDER");
    expect(result.grossAmount).toBe(100);
  });

  it("builds evidence only when COMPLETED", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: 180, feeAmount: 18, netAmount: 162 });
    mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

    const completed = makeOrder({
      status: "COMPLETED",
      completedAt: new Date("2026-09-21T10:00:00.000Z"),
      completedBy: "provider-1",
      observations: "ok",
      photos: [{ id: "p1", url: "http://minio/p1.webp" }],
    });
    const result = await assembler.assemble(completed, "provider-1", "PROVIDER");
    expect(result.evidence).toBeDefined();
    expect(result.evidence.completedBy).toBe("provider-1");

    const inProgress = makeOrder({ status: "IN_PROGRESS", completedAt: null });
    const result2 = await assembler.assemble(inProgress, "provider-1", "PROVIDER");
    expect(result2.evidence).toBeNull();
  });

  it("exposes authoritative DB timeline events", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: 180, feeAmount: 18, netAmount: 162 });
    mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

    const order = makeOrder({
      timelineEvents: [
        {
          eventKey: "SERVICE_STARTED",
          createdAt: new Date("2026-09-20T10:05:00.000Z"),
          actorId: "provider-1",
        },
      ],
    });
    const result = await assembler.assemble(order, "provider-1", "PROVIDER");

    expect(result.timeline).toEqual([
      {
        key: "SERVICE_STARTED",
        occurredAt: "2026-09-20T10:05:00.000Z",
        actorId: "provider-1",
      },
    ]);
  });

  it("returns empty timeline when order has no DB events", async () => {
    mockPricing.buildPricing.mockReturnValue({ grossAmount: 180, feeAmount: 18, netAmount: 162 });
    mockRepository.findUserById.mockResolvedValue({ id: "client-1", completeName: "Ana Costa" });

    const result = await assembler.assemble(makeOrder(), "provider-1", "PROVIDER");

    expect(result.timeline).toEqual([]);
  });
});

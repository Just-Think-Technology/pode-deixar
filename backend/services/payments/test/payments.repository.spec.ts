import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { PaymentMethod } from "@prisma/client";
import { PaymentsRepository } from "../src/payments/payments.repository";

describe("PaymentsRepository", () => {
  let repository: PaymentsRepository;

  const mockPrisma = {
    payment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    paymentWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    paymentStatusHistory: {
      create: jest.fn(),
    },
    serviceOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    proposal: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Supports both $transaction forms: array (create) and callback (webhook claim-first).
  mockPrisma.$transaction.mockImplementation((arg: any) => {
    if (typeof arg === "function") {
      return arg(mockPrisma);
    }
    return Promise.all(arg);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PaymentsRepository>(PaymentsRepository);
    jest.clearAllMocks();
  });

  it("finds a payment with its client", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: "payment-1" });

    await repository.findPaymentWithClient("payment-1");

    expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      include: { serviceOrder: { select: { clientId: true } } },
    });
  });

  it("lists payments of the authenticated client", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);

    await repository.findClientPayments("user-1");

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
      where: { serviceOrder: { clientId: "user-1" } },
      include: {
        serviceOrder: {
          select: {
            id: true,
            title: true,
            clientId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("finds an order with its accepted proposal", async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({ id: "order-1" });

    await repository.findOrderWithAcceptedProposal("order-1");

    expect(mockPrisma.serviceOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
      include: {
        proposals: {
          where: { status: "ACCEPTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  });

  it("finds a payment by idempotency key", async () => {
    mockPrisma.payment.findFirst.mockResolvedValue(null);

    await repository.findPaymentByIdempotency("order-1", "chave-123");

    expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
      where: { serviceOrderId: "order-1", idempotencyKey: "chave-123" },
    });
  });

  it("creates a payment and updates the schedule in one transaction", async () => {
    const scheduledAt = new Date("2026-08-20T14:00:00.000Z");
    mockPrisma.payment.create.mockResolvedValue({ id: "payment-1" });
    mockPrisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

    const result = await repository.createPayment({
      serviceOrderId: "order-1",
      amount: 150,
      currency: "BRL",
      method: PaymentMethod.PIX,
      feeRate: 0.1,
      feeAmount: 15,
      netAmount: 135,
      idempotencyKey: "chave-123",
      scheduledAt,
      scheduledEndAt: null,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: {
        serviceOrderId: "order-1",
        amount: 150,
        currency: "BRL",
        method: "PIX",
        status: "PENDING",
        feeRate: 0.1,
        feeAmount: 15,
        netAmount: 135,
        idempotencyKey: "chave-123",
      },
    });
    expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: {
        scheduledAt,
        scheduledEndAt: null,
      },
    });
    expect(result).toEqual({ id: "payment-1" });
  });

  it("claims a charge only when no externalRef exists", async () => {
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    await repository.claimCharge("payment-1", "claimed-ref");

    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", externalRef: null },
      data: { externalRef: "claimed-ref" },
    });
  });

  it("releases a charge claim", async () => {
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    await repository.releaseChargeClaim("payment-1", "claimed-ref");

    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", externalRef: "claimed-ref" },
      data: { externalRef: null },
    });
  });

  it("finalizes a charge with the gateway reference", async () => {
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

    await repository.finalizeCharge("payment-1", "claimed-ref", "12345");

    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", externalRef: "claimed-ref" },
      data: { externalRef: "12345" },
    });
  });

  it("finds a payment with its schedule", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: "payment-1" });

    await repository.findPaymentWithSchedule("payment-1");

    expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      include: {
        serviceOrder: { select: { scheduledAt: true } },
      },
    });
  });

  it("finds a payment by id", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: "payment-1" });

    await repository.findPaymentById("payment-1");

    expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
      where: { id: "payment-1" },
    });
  });

  it("finds a processed webhook event", async () => {
    mockPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);

    await repository.findProcessedEvent("MOCK", "evt_mock_1");

    expect(mockPrisma.paymentWebhookEvent.findUnique).toHaveBeenCalledWith({
      where: { gateway_eventId: { gateway: "MOCK", eventId: "evt_mock_1" } },
    });
  });

  it("records status history", async () => {
    mockPrisma.paymentStatusHistory.create.mockResolvedValue({ id: "h-1" });

    await repository.recordStatusHistory(
      "payment-1",
      "PENDING",
      "PAID",
      "MOCK",
      "Confirmação via webhook mock",
    );

    expect(mockPrisma.paymentStatusHistory.create).toHaveBeenCalledWith({
      data: {
        paymentId: "payment-1",
        statusAnterior: "PENDING",
        statusNovo: "PAID",
        actor: "MOCK",
        motivo: "Confirmação via webhook mock",
      },
    });
  });

  it("applies a mock webhook event and marks PAID in one transaction", async () => {
    mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
    mockPrisma.payment.update.mockResolvedValue({
      id: "payment-1",
      status: "PAID",
    });

    await repository.applyWebhookEvent(
      {
        gateway: "MOCK",
        eventId: "evt_mock_1",
        paymentId: "payment-1",
        payload: { externalId: "tx_mock_123" },
      },
      {
        paymentId: "payment-1",
        status: "PAID",
        paidAt: new Date("2026-08-20T14:00:00.000Z"),
        externalRef: "tx_mock_123",
      },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.paymentWebhookEvent.create).toHaveBeenCalledWith({
      data: {
        gateway: "MOCK",
        eventId: "evt_mock_1",
        paymentId: "payment-1",
        payload: { externalId: "tx_mock_123" },
      },
    });
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: {
        status: "PAID",
        paidAt: new Date("2026-08-20T14:00:00.000Z"),
        externalRef: "tx_mock_123",
      },
    });
  });

  it("applies a gateway webhook event with FAILED and null paidAt", async () => {
    mockPrisma.paymentWebhookEvent.create.mockResolvedValue({});
    mockPrisma.payment.update.mockResolvedValue({
      id: "payment-1",
      status: "FAILED",
    });

    await repository.applyWebhookEvent(
      {
        gateway: "MERCADO_PAGO",
        eventId: "evt_mp_1",
        paymentId: "payment-1",
        payload: {
          gatewayId: "12345",
          statusGateway: "FAILED",
          gatewayStatus: "rejected",
        },
      },
      {
        paymentId: "payment-1",
        status: "FAILED",
        paidAt: null,
        externalRef: "12345",
      },
    );

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: {
        status: "FAILED",
        paidAt: null,
        externalRef: "12345",
      },
    });
  });

  it("lists accepted proposals of a provider", async () => {
    mockPrisma.proposal.findMany.mockResolvedValue([]);

    await repository.findAcceptedProposals("provider-1");

    expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
      where: { providerId: "provider-1", status: "ACCEPTED" },
      select: { id: true, serviceOrderId: true },
    });
  });

  it("lists provider payments through accepted proposals", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);

    await repository.findProviderPayments("provider-1");

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        serviceOrder: {
          proposals: {
            some: { providerId: "provider-1", status: "ACCEPTED" },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("lists payments by order ids without status filter", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);

    await repository.findPaymentsByOrderIds(["order-1", "order-2"]);

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        serviceOrderId: { in: ["order-1", "order-2"] },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("lists payments by order ids with status filter", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);

    await repository.findPaymentsByOrderIds(["order-1"], "PENDING");

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        serviceOrderId: { in: ["order-1"] },
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("lists paid payments since a start date for the chart", async () => {
    const startDate = new Date("2026-03-01T00:00:00.000Z");
    mockPrisma.payment.findMany.mockResolvedValue([]);

    await repository.findPaidPaymentsSince("provider-1", startDate);

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        status: "PAID",
        paidAt: { gte: startDate },
        serviceOrder: {
          proposals: {
            some: { providerId: "provider-1", status: "ACCEPTED" },
          },
        },
      },
      select: {
        paidAt: true,
        feeRate: true,
        feeAmount: true,
        netAmount: true,
        amount: true,
      },
    });
  });
});

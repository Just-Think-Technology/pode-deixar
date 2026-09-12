import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { ServiceOrdersRepository } from "../src/service-orders/service-orders.repository";

describe("ServiceOrdersRepository", () => {
  let repository: ServiceOrdersRepository;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ServiceOrdersRepository>(ServiceOrdersRepository);
    jest.clearAllMocks();
  });

  it("finds a provider user with role selection", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "provider-1" });

    await repository.findProviderUserById("provider-1");

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      select: { id: true, role: true },
    });
  });

  it("creates an order with category include", async () => {
    mockPrisma.serviceOrder.create.mockResolvedValue({ id: "order-1" });

    await repository.createOrder({
      clientId: "client-1",
      providerId: null,
      title: "Test Order",
      description: "Test Description",
      categoryId: "cat-1",
      budgetMin: null,
      budgetMax: null,
    });

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
  });

  it("creates an order with provider and address", async () => {
    mockPrisma.serviceOrder.create.mockResolvedValue({ id: "order-1" });
    const address = {
      street: "Rua Augusta",
      number: "500",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "SP",
      postalCode: "01305-000",
    };

    await repository.createOrder({
      clientId: "client-1",
      providerId: "provider-1",
      title: "Test Order",
      description: "Test Description",
      categoryId: "cat-1",
      budgetMin: null,
      budgetMax: null,
      address,
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
        address,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("lists client orders with pagination", async () => {
    mockPrisma.serviceOrder.findMany.mockResolvedValue([]);

    await repository.findByClient("client-1", 0, 20);

    expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("lists received orders with pagination", async () => {
    mockPrisma.serviceOrder.findMany.mockResolvedValue([]);

    await repository.findReceivedByProvider("provider-1", 0, 20);

    expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
      where: { providerId: "provider-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("finds an order with proposals and category", async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({ id: "order-1" });

    await repository.findOrderWithProposalsById("order-1");

    expect(mockPrisma.serviceOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
      include: {
        proposals: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  });

  it("finds an order with proposals, photos and category for access check", async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({ id: "order-1" });

    await repository.findOrderWithAccessById("order-1");

    expect(mockPrisma.serviceOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
      include: {
        proposals: true,
        photos: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  });

  it("lists open orders excluding directed ones of other providers", async () => {
    mockPrisma.serviceOrder.findMany.mockResolvedValue([]);

    await repository.findOpenOrders("provider-1", 0, 20);

    expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
      where: {
        status: "OPEN",
        OR: [{ providerId: null }, { providerId: "provider-1" }],
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("updates an order with category include", async () => {
    mockPrisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

    await repository.updateOrder("order-1", {
      title: "Updated Title",
      description: "Test Description",
      categoryId: "cat-1",
      budgetMin: null,
      budgetMax: null,
    });

    expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: {
        title: "Updated Title",
        description: "Test Description",
        categoryId: "cat-1",
        budgetMin: null,
        budgetMax: null,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("cancels an order", async () => {
    mockPrisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

    await repository.cancelOrder("order-1");

    expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "CANCELLED" },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("completes an order", async () => {
    mockPrisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });

    await repository.completeOrder("order-1");

    expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "COMPLETED" },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("finds a provider service with profile and category", async () => {
    mockPrisma.providerService.findUnique.mockResolvedValue({ id: "service-1" });

    await repository.findProviderServiceById("service-1");

    expect(mockPrisma.providerService.findUnique).toHaveBeenCalledWith({
      where: { id: "service-1" },
      include: {
        providerProfile: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  });

  it("creates a hired order as IN_PROGRESS", async () => {
    mockPrisma.serviceOrder.create.mockResolvedValue({ id: "order-hired" });

    await repository.createHiredOrder({
      clientId: "client-1",
      providerId: "provider-1",
      providerServiceId: "service-1",
      agreedPrice: 150.0,
      title: "Instalação de chuveiro",
      description: "Instalação de chuveiro elétrico",
      categoryId: "cat-1",
    });

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

  it("queries the provider agenda with paid filter and proposal fallback", async () => {
    mockPrisma.serviceOrder.findMany.mockResolvedValue([]);
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");

    await repository.findProviderAgenda("provider-1", from, to);

    expect(mockPrisma.serviceOrder.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
        scheduledAt: { gte: from, lte: to },
        payments: { some: { status: "PAID" } },
        OR: [
          { providerId: "provider-1" },
          {
            proposals: { some: { providerId: "provider-1", status: "ACCEPTED" } },
          },
        ],
      },
      include: {
        photos: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          where: { status: "PAID" },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  });
});

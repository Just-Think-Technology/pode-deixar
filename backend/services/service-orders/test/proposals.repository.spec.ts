import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { ProposalsRepository } from "../src/proposals/proposals.repository";

describe("ProposalsRepository", () => {
  let repository: ProposalsRepository;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ProposalsRepository>(ProposalsRepository);
    jest.clearAllMocks();
  });

  it("finds an order by id", async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({ id: "order-1" });

    await repository.findOrderById("order-1");

    expect(mockPrisma.serviceOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
    });
  });

  it("finds an active proposal for provider and order", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue(null);

    await repository.findActiveProposal("order-1", "provider-1");

    expect(mockPrisma.proposal.findFirst).toHaveBeenCalledWith({
      where: {
        serviceOrderId: "order-1",
        providerId: "provider-1",
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
  });

  it("creates a proposal", async () => {
    mockPrisma.proposal.create.mockResolvedValue({ id: "proposal-1" });

    await repository.createProposal({
      serviceOrderId: "order-1",
      providerId: "provider-1",
      price: 150.0,
      description: "Posso realizar o serviço",
      estimatedDuration: "2 horas",
    });

    expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
      data: {
        serviceOrderId: "order-1",
        providerId: "provider-1",
        price: 150.0,
        description: "Posso realizar o serviço",
        estimatedDuration: "2 horas",
      },
    });
  });

  it("finds a proposal with order and category", async () => {
    mockPrisma.proposal.findUnique.mockResolvedValue({ id: "proposal-1" });

    await repository.findProposalWithOrderById("proposal-1");

    expect(mockPrisma.proposal.findUnique).toHaveBeenCalledWith({
      where: { id: "proposal-1" },
      include: {
        serviceOrder: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  });

  it("lists provider proposals with pagination and order detail", async () => {
    mockPrisma.proposal.findMany.mockResolvedValue([]);

    await repository.findProposalsByProvider("provider-1", 0, 20);

    expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
      where: { providerId: "provider-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
      include: {
        serviceOrder: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  });

  it("lists proposals of an order by ascending price", async () => {
    mockPrisma.proposal.findMany.mockResolvedValue([]);

    await repository.findProposalsByOrder("order-1");

    expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
      where: { serviceOrderId: "order-1" },
      orderBy: { price: "asc" },
    });
  });

  it("updates a proposal", async () => {
    mockPrisma.proposal.update.mockResolvedValue({ id: "proposal-1" });

    await repository.updateProposal("proposal-1", {
      price: 200.0,
      description: "Posso realizar o serviço",
      estimatedDuration: "2 horas",
    });

    expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
      where: { id: "proposal-1" },
      data: {
        price: 200.0,
        description: "Posso realizar o serviço",
        estimatedDuration: "2 horas",
      },
    });
  });

  it("accepts a proposal and rejects siblings in one transaction", async () => {
    mockPrisma.proposal.update.mockReturnThis();
    mockPrisma.proposal.updateMany.mockReturnThis();
    mockPrisma.serviceOrder.update.mockReturnThis();
    mockPrisma.$transaction.mockResolvedValue([{ id: "proposal-1" }]);

    await repository.acceptProposal("proposal-1", "order-1", "provider-1", 150);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
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
      data: {
        status: "IN_PROGRESS",
        providerId: "provider-1",
        agreedPrice: 150,
      },
    });
  });

  it("finds a proposal with its service order", async () => {
    mockPrisma.proposal.findUnique.mockResolvedValue({ id: "proposal-1" });

    await repository.findProposalWithServiceOrder("proposal-1");

    expect(mockPrisma.proposal.findUnique).toHaveBeenCalledWith({
      where: { id: "proposal-1" },
      include: { serviceOrder: true },
    });
  });
});

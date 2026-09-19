import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { CounterProposalsRepository } from "../src/counter-proposals/counter-proposals.repository";

describe("CounterProposalsRepository", () => {
  let repository: CounterProposalsRepository;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterProposalsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CounterProposalsRepository>(
      CounterProposalsRepository,
    );
    jest.clearAllMocks();
  });

  it("finds a proposal with its order", async () => {
    mockPrisma.proposal.findUnique.mockResolvedValue({ id: "proposal-1" });

    await repository.findProposalWithOrder("proposal-1");

    expect(mockPrisma.proposal.findUnique).toHaveBeenCalledWith({
      where: { id: "proposal-1" },
      include: { serviceOrder: true },
    });
  });

  it("finds a pending counter-proposal by proposal and sender", async () => {
    mockPrisma.counterProposal.findFirst.mockResolvedValue(null);

    await repository.findPendingByProposalAndSender("proposal-1", "client-1");

    expect(mockPrisma.counterProposal.findFirst).toHaveBeenCalledWith({
      where: {
        proposalId: "proposal-1",
        senderId: "client-1",
        status: "PENDING",
      },
    });
  });

  it("creates a counter-proposal", async () => {
    mockPrisma.counterProposal.create.mockResolvedValue({ id: "cp-1" });

    await repository.createCounterProposal({
      proposalId: "proposal-1",
      senderId: "client-1",
      price: 180.0,
      description: "Contraproposta do cliente",
      estimatedDuration: "3 dias",
    });

    expect(mockPrisma.counterProposal.create).toHaveBeenCalledWith({
      data: {
        proposalId: "proposal-1",
        senderId: "client-1",
        price: 180.0,
        description: "Contraproposta do cliente",
        estimatedDuration: "3 dias",
      },
    });
  });

  it("accepts a counter-proposal and settles the deal in one transaction", async () => {
    mockPrisma.counterProposal.update.mockReturnThis();
    mockPrisma.proposal.update.mockReturnThis();
    mockPrisma.proposal.updateMany.mockReturnThis();
    mockPrisma.counterProposal.updateMany.mockReturnThis();
    mockPrisma.serviceOrder.update.mockReturnThis();
    mockPrisma.$transaction.mockResolvedValue([{ id: "cp-1" }]);

    await repository.acceptCounterProposal(
      "cp-1",
      "proposal-1",
      "order-1",
      "provider-1",
      180,
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
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
      data: {
        status: "IN_PROGRESS",
        providerId: "provider-1",
        agreedPrice: 180,
      },
    });
  });

  it("lists counter-proposals of a proposal with pagination", async () => {
    mockPrisma.counterProposal.findMany.mockResolvedValue([]);

    await repository.findCounterProposalsByProposal("proposal-1", 0, 20);

    expect(mockPrisma.counterProposal.findMany).toHaveBeenCalledWith({
      where: { proposalId: "proposal-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("lists counter-proposals sent by a user with proposal summary", async () => {
    mockPrisma.counterProposal.findMany.mockResolvedValue([]);

    await repository.findSentBySender("client-1", 0, 20);

    expect(mockPrisma.counterProposal.findMany).toHaveBeenCalledWith({
      where: { senderId: "client-1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
      include: {
        proposal: {
          select: { id: true, serviceOrderId: true, price: true, status: true },
        },
      },
    });
  });
});

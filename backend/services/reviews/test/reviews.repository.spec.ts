import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@pode-deixar/prisma";
import { ReviewsRepository } from "../src/reviews/reviews.repository";

describe("ReviewsRepository", () => {
  let repository: ReviewsRepository;

  const mockPrisma = {
    serviceOrder: {
      findUnique: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    providerProfile: {
      updateMany: jest.fn(),
    },
    clientProfile: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<ReviewsRepository>(ReviewsRepository);
    jest.clearAllMocks();
  });

  it("finds an order by id", async () => {
    mockPrisma.serviceOrder.findUnique.mockResolvedValue({ id: "order-1" });

    await repository.findOrderById("order-1");

    expect(mockPrisma.serviceOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "order-1" },
    });
  });

  it("creates a review and recomputes both aggregates in one transaction", async () => {
    mockPrisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 5 },
      _count: { _all: 1 },
    });
    mockPrisma.review.create.mockResolvedValue({ id: "review-1" });

    await repository.createReview({
      serviceOrderId: "order-1",
      reviewerId: "client-1",
      revieweeId: "provider-1",
      rating: 5,
      comment: "Excelente serviço",
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: {
        serviceOrderId: "order-1",
        reviewerId: "client-1",
        revieweeId: "provider-1",
        rating: 5,
        comment: "Excelente serviço",
      },
    });
    expect(mockPrisma.providerProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "provider-1" },
      data: { rating: 5, totalReviews: 1 },
    });
    expect(mockPrisma.clientProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "provider-1" },
      data: { rating: 5, totalReviews: 1 },
    });
  });

  it("updates a review and recomputes the aggregate", async () => {
    mockPrisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 2 },
    });
    mockPrisma.review.update.mockResolvedValue({ id: "review-1", rating: 4 });

    await repository.updateReview("review-1", "provider-1", {
      rating: 4,
      comment: null,
    });

    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { rating: 4, comment: null },
    });
    expect(mockPrisma.providerProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "provider-1" },
      data: { rating: 4.5, totalReviews: 2 },
    });
  });

  it("deletes a review and recomputes the aggregate", async () => {
    mockPrisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4 },
      _count: { _all: 2 },
    });
    mockPrisma.review.delete.mockResolvedValue({ id: "review-1" });

    await repository.deleteReview("review-1", "provider-1");

    expect(mockPrisma.review.delete).toHaveBeenCalledWith({
      where: { id: "review-1" },
    });
    expect(mockPrisma.providerProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "provider-1" },
      data: { rating: 4, totalReviews: 2 },
    });
  });

  it("lists provider reviews with the given cap", async () => {
    mockPrisma.review.findMany.mockResolvedValue([]);

    await repository.findReviewsByReviewee("provider-1", 50);

    expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
      where: { revieweeId: "provider-1" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { ReviewsService } from "../src/reviews/reviews.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { ReviewsLoggerService } from "../src/shared/reviews-logger.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

describe("ReviewsService", () => {
  let service: ReviewsService;

  const completedOrder = {
    id: "order-1",
    clientId: "client-1",
    providerId: "provider-1",
    status: "COMPLETED",
  };

  const reviewBase = {
    id: "review-1",
    serviceOrderId: "order-1",
    reviewerId: "client-1",
    revieweeId: "provider-1",
    rating: 5,
    comment: "Excelente serviço",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  const mockLogger = {
    logReviewCreated: jest.fn(),
    logReviewUpdated: jest.fn(),
    logReviewDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReviewsLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const dto = {
      serviceOrderId: "order-1",
      rating: 5,
      comment: "Excelente serviço",
    };

    beforeEach(() => {
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { _all: 1 },
      });
    });

    it("should create a review from client to provider and update provider rating", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue(reviewBase);

      const result = await service.create("client-1", dto);

      expect(result.rating).toBe(5);
      expect(result.reviewee_id).toBe("provider-1");
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
      expect(mockLogger.logReviewCreated).toHaveBeenCalled();
    });

    it("should create a review from provider to client and update client rating", async () => {
      const providerReview = {
        ...reviewBase,
        reviewerId: "provider-1",
        revieweeId: "client-1",
      };

      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue(providerReview);

      const result = await service.create("provider-1", dto);

      expect(result.reviewee_id).toBe("client-1");
      expect(mockPrisma.clientProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: "client-1" },
        data: { rating: 5, totalReviews: 1 },
      });
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when order is not completed", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        ...completedOrder,
        status: "IN_PROGRESS",
      });

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when order has no paid payment", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException when user is not a party of the order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });

      await expect(service.create("other-1", dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw BadRequestException when user already reviewed the order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
      mockPrisma.review.findUnique.mockResolvedValue(reviewBase);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException on unique constraint race (P2002)", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockRejectedValue({ code: "P2002" });

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findMine", () => {
    it("should return reviews authored by the user", async () => {
      mockPrisma.review.findMany.mockResolvedValue([reviewBase]);

      const result = await service.findMine("client-1");

      expect(result).toHaveLength(1);
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { reviewerId: "client-1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findByProvider", () => {
    it("should return reviews targeting the provider", async () => {
      mockPrisma.review.findMany.mockResolvedValue([reviewBase]);

      const result = await service.findByProvider("provider-1");

      expect(result).toHaveLength(1);
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { revieweeId: "provider-1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findByOrder", () => {
    it("should return reviews of an order when user is a party", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.review.findMany.mockResolvedValue([reviewBase]);

      const result = await service.findByOrder("order-1", "client-1");

      expect(result).toHaveLength(1);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(service.findByOrder("order-x", "client-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not a party of the order", async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(completedOrder);

      await expect(service.findByOrder("order-1", "other-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("update", () => {
    const updateDto = { rating: 4 };

    it("should update own review within the 5-minute window", async () => {
      const recentReview = {
        ...reviewBase,
        createdAt: new Date(Date.now() - 60 * 1000),
      };
      const updatedReview = { ...recentReview, rating: 4 };

      mockPrisma.review.findUnique.mockResolvedValue(recentReview);
      mockPrisma.review.update.mockResolvedValue(updatedReview);
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { _all: 2 },
      });

      const result = await service.update("client-1", "review-1", updateDto);

      expect(result.rating).toBe(4);
      expect(mockPrisma.providerProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: "provider-1" },
        data: { rating: 4.5, totalReviews: 2 },
      });
      expect(mockLogger.logReviewUpdated).toHaveBeenCalled();
    });

    it("should throw NotFoundException when review does not exist", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.update("client-1", "review-x", updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not the author", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(reviewBase);

      await expect(
        service.update("provider-1", "review-1", updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when edit window expired", async () => {
      const oldReview = {
        ...reviewBase,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      };

      mockPrisma.review.findUnique.mockResolvedValue(oldReview);

      await expect(
        service.update("client-1", "review-1", updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no field is provided", async () => {
      const recentReview = {
        ...reviewBase,
        createdAt: new Date(Date.now() - 60 * 1000),
      };

      mockPrisma.review.findUnique.mockResolvedValue(recentReview);

      await expect(
        service.update("client-1", "review-1", {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should delete own review and recompute aggregate", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(reviewBase);
      mockPrisma.review.delete.mockResolvedValue(reviewBase);
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4 },
        _count: { _all: 2 },
      });

      const result = await service.remove("client-1", "review-1");

      expect(result.message).toBe("Avaliação excluída com sucesso");
      expect(mockPrisma.review.delete).toHaveBeenCalledWith({
        where: { id: "review-1" },
      });
      expect(mockPrisma.providerProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: "provider-1" },
        data: { rating: 4, totalReviews: 2 },
      });
      expect(mockLogger.logReviewDeleted).toHaveBeenCalled();
    });

    it("should throw NotFoundException when review does not exist", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(service.remove("client-1", "review-x")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not the author", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(reviewBase);

      await expect(service.remove("provider-1", "review-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
import { Test, TestingModule } from "@nestjs/testing";
import { ReviewsService } from "../src/reviews/reviews.service";
import { ReviewsRepository } from "../src/reviews/reviews.repository";
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

  const mockRepository = {
    findOrderById: jest.fn(),
    findPaidPaymentByOrderId: jest.fn(),
    findReviewByOrderAndReviewer: jest.fn(),
    findReviewById: jest.fn(),
    findReviewsByReviewer: jest.fn(),
    findReviewsByReviewee: jest.fn(),
    findReviewsByOrder: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
    deleteReview: jest.fn(),
  };

  const mockLogger = {
    logReviewCreated: jest.fn(),
    logReviewUpdated: jest.fn(),
    logReviewDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: mockRepository },
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

    it("should create a review from client to provider", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findPaidPaymentByOrderId.mockResolvedValue({ id: "pay-1" });
      mockRepository.findReviewByOrderAndReviewer.mockResolvedValue(null);
      mockRepository.createReview.mockResolvedValue(reviewBase);

      const result = await service.create("client-1", dto);

      expect(result.rating).toBe(5);
      expect(result.reviewee_id).toBe("provider-1");
      expect(mockRepository.createReview).toHaveBeenCalledWith({
        serviceOrderId: "order-1",
        reviewerId: "client-1",
        revieweeId: "provider-1",
        rating: 5,
        comment: "Excelente serviço",
      });
      expect(mockLogger.logReviewCreated).toHaveBeenCalled();
    });

    it("should create a review from provider to client", async () => {
      const providerReview = {
        ...reviewBase,
        reviewerId: "provider-1",
        revieweeId: "client-1",
      };

      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findPaidPaymentByOrderId.mockResolvedValue({ id: "pay-1" });
      mockRepository.findReviewByOrderAndReviewer.mockResolvedValue(null);
      mockRepository.createReview.mockResolvedValue(providerReview);

      const result = await service.create("provider-1", dto);

      expect(result.reviewee_id).toBe("client-1");
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when order is not completed", async () => {
      mockRepository.findOrderById.mockResolvedValue({
        ...completedOrder,
        status: "IN_PROGRESS",
      });

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when order has no paid payment", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findPaidPaymentByOrderId.mockResolvedValue(null);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException when user is not a party of the order", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findPaidPaymentByOrderId.mockResolvedValue({ id: "pay-1" });

      await expect(service.create("other-1", dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw BadRequestException when user already reviewed the order", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findPaidPaymentByOrderId.mockResolvedValue({ id: "pay-1" });
      mockRepository.findReviewByOrderAndReviewer.mockResolvedValue(reviewBase);

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException on unique constraint race (P2002)", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findPaidPaymentByOrderId.mockResolvedValue({ id: "pay-1" });
      mockRepository.findReviewByOrderAndReviewer.mockResolvedValue(null);
      mockRepository.createReview.mockRejectedValue({ code: "P2002" });

      await expect(service.create("client-1", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findMine", () => {
    it("should return reviews authored by the user", async () => {
      mockRepository.findReviewsByReviewer.mockResolvedValue([reviewBase]);

      const result = await service.findMine("client-1");

      expect(result).toHaveLength(1);
      expect(mockRepository.findReviewsByReviewer).toHaveBeenCalledWith(
        "client-1",
      );
    });
  });

  describe("findByProvider", () => {
    it("should return reviews targeting the provider", async () => {
      mockRepository.findReviewsByReviewee.mockResolvedValue([reviewBase]);

      const result = await service.findByProvider("provider-1");

      expect(result).toHaveLength(1);
      expect(mockRepository.findReviewsByReviewee).toHaveBeenCalledWith(
        "provider-1",
        // Public listing is capped to deter scraping.
        50,
      );
    });

    // Covers the public listing cap.
    it("should cap limit at 50", async () => {
      mockRepository.findReviewsByReviewee.mockResolvedValue([]);

      await service.findByProvider("provider-1", 200);

      expect(mockRepository.findReviewsByReviewee).toHaveBeenCalledWith(
        "provider-1",
        50,
      );
    });
  });

  describe("findByOrder", () => {
    it("should return reviews of an order when user is a party", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);
      mockRepository.findReviewsByOrder.mockResolvedValue([reviewBase]);

      const result = await service.findByOrder("order-1", "client-1");

      expect(result).toHaveLength(1);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(service.findByOrder("order-x", "client-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not a party of the order", async () => {
      mockRepository.findOrderById.mockResolvedValue(completedOrder);

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

      mockRepository.findReviewById.mockResolvedValue(recentReview);
      mockRepository.updateReview.mockResolvedValue(updatedReview);

      const result = await service.update("client-1", "review-1", updateDto);

      expect(result.rating).toBe(4);
      expect(mockRepository.updateReview).toHaveBeenCalledWith(
        "review-1",
        "provider-1",
        { rating: 4, comment: "Excelente serviço" },
      );
      expect(mockLogger.logReviewUpdated).toHaveBeenCalled();
    });

    it("should throw NotFoundException when review does not exist", async () => {
      mockRepository.findReviewById.mockResolvedValue(null);

      await expect(
        service.update("client-1", "review-x", updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not the author", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);

      await expect(
        service.update("provider-1", "review-1", updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when edit window expired", async () => {
      const oldReview = {
        ...reviewBase,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      };

      mockRepository.findReviewById.mockResolvedValue(oldReview);

      await expect(
        service.update("client-1", "review-1", updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no field is provided", async () => {
      const recentReview = {
        ...reviewBase,
        createdAt: new Date(Date.now() - 60 * 1000),
      };

      mockRepository.findReviewById.mockResolvedValue(recentReview);

      await expect(
        service.update("client-1", "review-1", {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should delete own review", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.deleteReview.mockResolvedValue(undefined);

      const result = await service.remove("client-1", "review-1");

      expect(result.message).toBe("Avaliação excluída com sucesso");
      expect(mockRepository.deleteReview).toHaveBeenCalledWith(
        "review-1",
        "provider-1",
      );
      expect(mockLogger.logReviewDeleted).toHaveBeenCalled();
    });

    it("should throw NotFoundException when review does not exist", async () => {
      mockRepository.findReviewById.mockResolvedValue(null);

      await expect(service.remove("client-1", "review-x")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not the author", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);

      await expect(service.remove("provider-1", "review-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

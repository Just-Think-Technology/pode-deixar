// Reviews tests — creation and lookup logic

import { Test, TestingModule } from "@nestjs/testing";
import { ReviewsService } from "../src/reviews/reviews.service";
import { ReviewsRepository } from "../src/reviews/reviews.repository";
import { ReviewsLoggerService } from "../src/shared/reviews-logger.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";

// --- Tests ---

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
    // New provider listing/summary helpers
    resolveProviderUserId: jest.fn(),
    countFilteredReviews: jest.fn(),
    aggregateFilteredReviews: jest.fn(),
    groupByRatingFiltered: jest.fn(),
    findFilteredReviews: jest.fn(),
    findReviewerProfiles: jest.fn(),
    formatDisplayName: jest.fn(),
    // Responses / reports / notifications
    findReviewResponseByReviewId: jest.fn(),
    createReviewResponse: jest.fn(),
    updateReviewResponse: jest.fn(),
    findReviewReport: jest.fn(),
    findReportsByReporter: jest.fn(),
    createReviewReport: jest.fn(),
    findOrderForNotification: jest.fn(),
    notify: jest.fn(),
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
    mockRepository.formatDisplayName.mockImplementation((name: string | null) => {
      if (!name) return "Cliente";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0];
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    });
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
    it("should return paginated reviews with privacy shape and hide IDs", async () => {
      const reviewWithResponse = {
        ...reviewBase,
        response: { message: "Obrigado!", createdAt: new Date() },
      };
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(1);
      mockRepository.findFilteredReviews.mockResolvedValue([reviewWithResponse]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "Ana Silva"]]),
        avatarMap: new Map([["client-1", "https://avatar.url/c1.png"]]),
      });

      const result = await service.findByProvider("provider-1", {
        page: 1,
        limit: 10,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: "review-1",
          rating: 5,
          comment: "Excelente serviço",
          reviewer: { display_name: "Ana S.", avatar_url: "https://avatar.url/c1.png" },
        }),
      );
      // Never expose internal IDs
      expect(result.data[0]).not.toHaveProperty("reviewer_id");
      expect(result.data[0]).not.toHaveProperty("reviewee_id");
      expect(result.data[0]).not.toHaveProperty("service_order_id");
      expect(result.data[0]).not.toHaveProperty("reviewerId");
      expect(result.data[0]).not.toHaveProperty("revieweeId");
      expect(result.data[0].response).toEqual(
        expect.objectContaining({ message: "Obrigado!" }),
      );
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, hasMore: false });
      expect(mockRepository.resolveProviderUserId).toHaveBeenCalledWith("provider-1");
      expect(mockRepository.countFilteredReviews).toHaveBeenCalledWith("provider-1");
    });

    it("should return paginated reviews with null reviewer privacy fallback", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(1);
      mockRepository.findFilteredReviews.mockResolvedValue([{ ...reviewBase, response: null }]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map(),
        avatarMap: new Map(),
      });

      const result = await service.findByProvider("provider-1", { page: 1, limit: 10 } as any);

      expect(result.data[0].reviewer).toEqual({ display_name: "Cliente", avatar_url: null });
      expect(result.data[0].response).toBeNull();
    });

    it("should cap limit at 50 via DTO and return pagination meta", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(0);
      mockRepository.findFilteredReviews.mockResolvedValue([]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map(),
        avatarMap: new Map(),
      });

      const result = await service.findByProvider("provider-1", {
        page: 1,
        limit: 200,
      } as any);

      expect(result.data).toHaveLength(0);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.hasMore).toBe(false);
    });

    it("should default to page 1 limit 10 when no query provided", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(0);

      const result = await service.findByProvider("provider-1" as any, undefined as any);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(0);
    });

    it("should throw NotFoundException when provider not found", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue(null);

      await expect(service.findByProvider("unknown-id", { page: 1, limit: 10 } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set hasMore correctly across pages", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(25);
      mockRepository.findFilteredReviews.mockResolvedValue([reviewBase]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "Carlos Mendes"]]),
        avatarMap: new Map([["client-1", null]]),
      });

      const first = await service.findByProvider("provider-1", { page: 1, limit: 10 } as any);
      expect(first.meta.hasMore).toBe(true);
      const second = await service.findByProvider("provider-1", { page: 2, limit: 10 } as any);
      expect(second.meta.hasMore).toBe(true);
      const lastPage = await (async () => {
        mockRepository.countFilteredReviews.mockResolvedValue(25);
        mockRepository.findFilteredReviews.mockResolvedValue([reviewBase]);
        return service.findByProvider("provider-1", { page: 3, limit: 10 } as any);
      })();
      expect(lastPage.meta.hasMore).toBe(false);
      // Exact boundary: total 10 limit 10 page1 => hasMore false
      mockRepository.countFilteredReviews.mockResolvedValue(10);
      const exact = await service.findByProvider("provider-1", { page: 1, limit: 10 } as any);
      expect(exact.meta.hasMore).toBe(false);
      // Beyond: page 2 with total 10 should be no more
      const beyond = await service.findByProvider("provider-1", { page: 2, limit: 10 } as any);
      expect(beyond.meta.hasMore).toBe(false);
    });

    it("should include response embedded when review has response", async () => {
      const withResponse = { ...reviewBase, response: { message: "Obrigado!", createdAt: new Date() } };
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(1);
      mockRepository.findFilteredReviews.mockResolvedValue([withResponse]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "Ana Silva"]]),
        avatarMap: new Map([["client-1", null]]),
      });
      const result = await service.findByProvider("provider-1", { page: 1, limit: 10 } as any);
      expect(result.data[0].response).toEqual(expect.objectContaining({ message: "Obrigado!" }));
    });

    it("should exclude reviews from non-COMPLETED+PAID orders via filtered repository", async () => {
      // Service delegates to countFilteredReviews/findFilteredReviews which filter COMPLETED+PAID.
      // Verify service never calls unfiltered findReviewsByReviewee.
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.countFilteredReviews.mockResolvedValue(0);
      await service.findByProvider("provider-1", { page: 1, limit: 10 } as any);
      expect(mockRepository.countFilteredReviews).toHaveBeenCalledWith("provider-1");
      expect(mockRepository.findReviewsByReviewee).not.toHaveBeenCalled();
    });
  });

  describe("getProviderSummary", () => {
    it("should return summary with average null when no reviews", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.aggregateFilteredReviews.mockResolvedValue({
        _avg: { rating: null },
        _count: { _all: 0 },
      });
      mockRepository.groupByRatingFiltered.mockResolvedValue([]);

      const result = await service.getProviderSummary("provider-1");

      expect(result).toEqual({
        provider_id: "provider-1",
        average: null,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    });

    it("should return summary with distribution and average via aggregate+groupBy", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.aggregateFilteredReviews.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { _all: 2 },
      });
      mockRepository.groupByRatingFiltered.mockResolvedValue([
        { rating: 5, _count: { rating: 1 } },
        { rating: 4, _count: { rating: 1 } },
      ]);

      const result = await service.getProviderSummary("provider-1");

      expect(result.provider_id).toBe("provider-1");
      expect(result.average).toBe(4.5);
      expect(result.total).toBe(2);
      expect(result.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 });
    });

    it("should return average distribution across 1-5 with zeros for missing ratings", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.aggregateFilteredReviews.mockResolvedValue({
        _avg: { rating: 3.0 },
        _count: { _all: 3 },
      });
      mockRepository.groupByRatingFiltered.mockResolvedValue([
        { rating: 5, _count: { rating: 1 } },
        { rating: 3, _count: { rating: 1 } },
        { rating: 1, _count: { rating: 1 } },
      ]);

      const result = await service.getProviderSummary("provider-1");

      expect(result.average).toBe(3.0);
      expect(result.total).toBe(3);
      expect(result.distribution).toEqual({ 1: 1, 2: 0, 3: 1, 4: 0, 5: 1 });
    });

    it("should handle average with decimal precision", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue("provider-1");
      mockRepository.aggregateFilteredReviews.mockResolvedValue({
        _avg: { rating: 4.33 },
        _count: { _all: 3 },
      });
      mockRepository.groupByRatingFiltered.mockResolvedValue([
        { rating: 5, _count: { rating: 2 } },
        { rating: 3, _count: { rating: 1 } },
      ]);

      const result = await service.getProviderSummary("provider-1");
      expect(result.average).toBe(4.33);
      expect(result.distribution[5]).toBe(2);
      expect(result.distribution[3]).toBe(1);
    });

    it("should throw NotFoundException when provider not found", async () => {
      mockRepository.resolveProviderUserId.mockResolvedValue(null);

      await expect(service.getProviderSummary("unknown")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findReceived", () => {
    it("should return paginated received reviews with privacy and report_status NONE", async () => {
      mockRepository.countFilteredReviews.mockResolvedValue(1);
      mockRepository.findFilteredReviews.mockResolvedValue([
        { ...reviewBase, response: null },
      ]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "Ana Silva"]]),
        avatarMap: new Map([["client-1", null]]),
      });
      mockRepository.findReportsByReporter.mockResolvedValue([]);

      const result = await service.findReceived("provider-1", { page: 1, limit: 10 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: "review-1",
          rating: 5,
          report_status: "NONE",
        }),
      );
      expect(result.data[0]).not.toHaveProperty("reviewer_id");
      expect(result.data[0]).not.toHaveProperty("reviewee_id");
      expect(result.data[0].reviewer).toEqual({ display_name: "Ana S.", avatar_url: null });
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, hasMore: false });
    });

    it("should map report_status PENDING and RESOLVED (DISMISSED/UPHELD)", async () => {
      mockRepository.countFilteredReviews.mockResolvedValue(2);
      mockRepository.findFilteredReviews.mockResolvedValue([
        { ...reviewBase, id: "r1" },
        { ...reviewBase, id: "r2" },
      ]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "Client One"]]),
        avatarMap: new Map([["client-1", null]]),
      });
      mockRepository.findReportsByReporter.mockResolvedValue([
        { reviewId: "r1", status: "PENDING" } as any,
        { reviewId: "r2", status: "DISMISSED" } as any,
      ]);

      const result = await service.findReceived("provider-1", { page: 1, limit: 10 } as any);
      const byIds: Record<string, string> = Object.fromEntries(result.data.map((r: any) => [r.id, r.report_status]));
      expect(byIds["r1"]).toBe("PENDING");
      expect(byIds["r2"]).toBe("RESOLVED");
    });

    it("should set hasMore correctly for received listing", async () => {
      mockRepository.countFilteredReviews.mockResolvedValue(20);
      mockRepository.findFilteredReviews.mockResolvedValue([reviewBase]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "João Pedro"]]),
        avatarMap: new Map([["client-1", null]]),
      });
      mockRepository.findReportsByReporter.mockResolvedValue([]);
      const first = await service.findReceived("provider-1", { page: 1, limit: 10 } as any);
      expect(first.meta.hasMore).toBe(true);
      mockRepository.countFilteredReviews.mockResolvedValue(20);
      const last = await service.findReceived("provider-1", { page: 2, limit: 10 } as any);
      expect(last.meta.hasMore).toBe(false);
    });

    it("should include response embedded for received listing", async () => {
      const withResp = { ...reviewBase, response: { message: "Obrigado!", createdAt: new Date() } };
      mockRepository.countFilteredReviews.mockResolvedValue(1);
      mockRepository.findFilteredReviews.mockResolvedValue([withResp]);
      mockRepository.findReviewerProfiles.mockResolvedValue({
        userMap: new Map([["client-1", "Ana Silva"]]),
        avatarMap: new Map([["client-1", null]]),
      });
      mockRepository.findReportsByReporter.mockResolvedValue([]);
      const result = await service.findReceived("provider-1", { page: 1, limit: 10 } as any);
      expect(result.data[0].response).toEqual(expect.objectContaining({ message: "Obrigado!" }));
    });

    it("should default to page 1 limit 10 when no query provided", async () => {
      mockRepository.countFilteredReviews.mockResolvedValue(0);
      const result = await service.findReceived("provider-1", undefined as any);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe("createResponse", () => {
    const dto = { message: "Obrigado pelo feedback!" };

    it("should create response when reviewee matches", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewResponseByReviewId.mockResolvedValue(null);
      mockRepository.createReviewResponse.mockResolvedValue({
        id: "resp-1",
        reviewId: "review-1",
        message: dto.message,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createResponse("provider-1", "review-1", dto as any);

      expect(result.message).toBe(dto.message);
      expect(result.review_id).toBe("review-1");
      expect(mockRepository.createReviewResponse).toHaveBeenCalledWith("review-1", dto.message);
    });

    it("should throw NotFoundException when review not found", async () => {
      mockRepository.findReviewById.mockResolvedValue(null);
      await expect(service.createResponse("provider-1", "unknown", dto as any)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not reviewee", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      await expect(service.createResponse("client-1", "review-1", dto as any)).rejects.toThrow(ForbiddenException);
    });

    it("should throw ConflictException when response already exists", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewResponseByReviewId.mockResolvedValue({ id: "resp-1" });
      await expect(service.createResponse("provider-1", "review-1", dto as any)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException on P2002 race", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewResponseByReviewId.mockResolvedValue(null);
      mockRepository.createReviewResponse.mockRejectedValue({ code: "P2002" });
      await expect(service.createResponse("provider-1", "review-1", dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe("updateResponse", () => {
    const dto = { message: "Atualizado" };

    it("should update response when reviewee matches", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewResponseByReviewId.mockResolvedValue({ id: "resp-1" });
      mockRepository.updateReviewResponse.mockResolvedValue({
        id: "resp-1",
        reviewId: "review-1",
        message: dto.message,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateResponse("provider-1", "review-1", dto as any);
      expect(result.message).toBe(dto.message);
    });

    it("should throw NotFoundException when review not found", async () => {
      mockRepository.findReviewById.mockResolvedValue(null);
      await expect(service.updateResponse("provider-1", "review-1", dto as any)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when not reviewee", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      await expect(service.updateResponse("other-1", "review-1", dto as any)).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when response not found", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewResponseByReviewId.mockResolvedValue(null);
      await expect(service.updateResponse("provider-1", "review-1", dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe("createReport", () => {
    const dto = { reason: "OFENSA" as any };

    it("should create report when reviewee matches", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewReport.mockResolvedValue(null);
      mockRepository.createReviewReport.mockResolvedValue({
        id: "rep-1",
        reviewId: "review-1",
        reporterId: "provider-1",
        reason: "OFENSA",
        description: null,
        status: "PENDING",
        createdAt: new Date(),
      });

      const result = await service.createReport("provider-1", "review-1", dto);
      expect(result.status).toBe("PENDING");
      expect(result.review_id).toBe("review-1");
    });

    it("should throw NotFoundException when review not found", async () => {
      mockRepository.findReviewById.mockResolvedValue(null);
      await expect(service.createReport("provider-1", "unknown", dto)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when not reviewee", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      await expect(service.createReport("client-1", "review-1", dto)).rejects.toThrow(ForbiddenException);
    });

    it("should throw ConflictException when report already pending", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewReport.mockResolvedValue({ id: "rep-1", status: "PENDING" });
      await expect(service.createReport("provider-1", "review-1", dto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when report already resolved (DISMISSED/UPHELD)", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewReport.mockResolvedValue({ id: "rep-1", status: "DISMISSED" });
      await expect(service.createReport("provider-1", "review-1", dto)).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException on P2002 race", async () => {
      mockRepository.findReviewById.mockResolvedValue(reviewBase);
      mockRepository.findReviewReport.mockResolvedValue(null);
      mockRepository.createReviewReport.mockRejectedValue({ code: "P2002" });
      await expect(service.createReport("provider-1", "review-1", dto)).rejects.toThrow(ConflictException);
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

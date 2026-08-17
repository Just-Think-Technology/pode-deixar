import { Test, TestingModule } from "@nestjs/testing";
import {
  ReviewsController,
  PublicReviewsController,
} from "../src/reviews/reviews.controller";
import { ReviewsService } from "../src/reviews/reviews.service";

describe("ReviewsController", () => {
  let controller: ReviewsController;
  let publicController: PublicReviewsController;

  const mockReviewsService = {
    create: jest.fn(),
    findMine: jest.fn(),
    findByOrder: jest.fn(),
    findByProvider: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockReq = {
    user: { sub: "client-1", role: "CLIENT" },
    ip: "127.0.0.1",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController, PublicReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    publicController =
      module.get<PublicReviewsController>(PublicReviewsController);
    jest.clearAllMocks();
  });

  it("should delegate create with user id and body", async () => {
    const dto = { serviceOrderId: "order-1", rating: 5, comment: "Bom" };
    mockReviewsService.create.mockResolvedValue({ id: "review-1" });

    const result = await controller.create(mockReq, dto);

    expect(mockReviewsService.create).toHaveBeenCalledWith(
      "client-1",
      dto,
      "127.0.0.1",
    );
    expect(result).toEqual({ id: "review-1" });
  });

  it("should delegate findMine with user id", async () => {
    mockReviewsService.findMine.mockResolvedValue([]);

    const result = await controller.findMine(mockReq);

    expect(mockReviewsService.findMine).toHaveBeenCalledWith("client-1");
    expect(result).toEqual([]);
  });

  it("should delegate findByOrder with order id and user id", async () => {
    mockReviewsService.findByOrder.mockResolvedValue([]);

    const result = await controller.findByOrder(mockReq, "order-1");

    expect(mockReviewsService.findByOrder).toHaveBeenCalledWith(
      "order-1",
      "client-1",
    );
    expect(result).toEqual([]);
  });

  it("should delegate findByProvider (public)", async () => {
    mockReviewsService.findByProvider.mockResolvedValue([]);

    const result = await publicController.findByProvider("provider-1");

    expect(mockReviewsService.findByProvider).toHaveBeenCalledWith(
      "provider-1",
    );
    expect(result).toEqual([]);
  });

  it("should delegate update with user id, review id and body", async () => {
    const dto = { rating: 4 };
    mockReviewsService.update.mockResolvedValue({ id: "review-1" });

    const result = await controller.update(mockReq, "review-1", dto);

    expect(mockReviewsService.update).toHaveBeenCalledWith(
      "client-1",
      "review-1",
      dto,
      "127.0.0.1",
    );
    expect(result).toEqual({ id: "review-1" });
  });

  it("should delegate remove with user id and review id", async () => {
    mockReviewsService.remove.mockResolvedValue({
      message: "Avaliação excluída com sucesso",
    });

    const result = await controller.remove(mockReq, "review-1");

    expect(mockReviewsService.remove).toHaveBeenCalledWith(
      "client-1",
      "review-1",
      "127.0.0.1",
    );
    expect(result.message).toBe("Avaliação excluída com sucesso");
  });
});
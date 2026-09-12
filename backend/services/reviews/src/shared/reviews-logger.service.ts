import { Injectable } from "@nestjs/common";
import { BaseDomainLogger } from "@pode-deixar/logger";

@Injectable()
export class ReviewsLoggerService extends BaseDomainLogger {
  constructor() {
    super("reviews-service");
  }

  logReviewCreated(
    reviewerId: string,
    reviewId: string,
    orderId: string,
    revieweeId: string,
    ip?: string,
  ) {
    this.logger.info("review_created", `Review ${reviewId} created`, {
      reviewerId,
      reviewId,
      orderId,
      revieweeId,
      ip,
    });
  }

  logReviewUpdated(reviewerId: string, reviewId: string, ip?: string) {
    this.logger.info("review_updated", `Review ${reviewId} updated`, {
      reviewerId,
      reviewId,
      ip,
    });
  }

  logReviewDeleted(reviewerId: string, reviewId: string, ip?: string) {
    this.logger.info("review_deleted", `Review ${reviewId} deleted`, {
      reviewerId,
      reviewId,
      ip,
    });
  }
}

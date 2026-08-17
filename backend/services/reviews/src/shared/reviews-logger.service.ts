import { Injectable } from "@nestjs/common";
import { createLogger, LoggerWithEvent } from "@pode-deixar/logger";

@Injectable()
export class ReviewsLoggerService {
  private readonly logger: LoggerWithEvent;

  constructor() {
    this.logger = createLogger("reviews-service");
  }

  logInfo(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.info(event, message, meta);
  }

  logWarn(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.warn(event, message, meta);
  }

  logError(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.error(event, message, meta);
  }

  logDebug(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.debug(event, message, meta);
  }

  logSecurityEvent(event: string, meta: Record<string, unknown>) {
    this.logger.warn(event, `Security event: ${event}`, meta);
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

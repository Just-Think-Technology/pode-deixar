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
}

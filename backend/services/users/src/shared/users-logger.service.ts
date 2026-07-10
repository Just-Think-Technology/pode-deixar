import { Injectable } from "@nestjs/common";
import { createLogger, LoggerWithEvent } from "@pode-deixar/logger";

@Injectable()
export class UsersLoggerService {
  private readonly logger: LoggerWithEvent;

  constructor() {
    this.logger = createLogger("users-service");
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

  logProfileCreated(userId: string, role: string, ip?: string) {
    this.logger.info("profile_created", `Profile created for user ${userId}`, {
      userId,
      role,
      ip,
    });
  }

  logProfileUpdated(userId: string, role: string, ip?: string) {
    this.logger.info("profile_updated", `Profile updated for user ${userId}`, {
      userId,
      role,
      ip,
    });
  }

  logProfileFetched(userId: string, role: string, ip?: string) {
    this.logger.debug("profile_fetched", `Profile fetched for user ${userId}`, {
      userId,
      role,
      ip,
    });
  }

  logAvatarUploaded(userId: string, role: string, ip?: string) {
    this.logger.info("avatar_uploaded", `Avatar uploaded for user ${userId}`, {
      userId,
      role,
      ip,
    });
  }

  logSecurityEvent(event: string, meta: Record<string, unknown>) {
    this.logger.warn(event, `Security event: ${event}`, meta);
  }

  logServiceCreated(providerProfileId: string, serviceId: string, ip?: string) {
    this.logger.info(
      "service_created",
      `Service created for provider ${providerProfileId}`,
      {
        providerProfileId,
        serviceId,
        ip,
      },
    );
  }

  logServiceUpdated(providerProfileId: string, serviceId: string, ip?: string) {
    this.logger.info(
      "service_updated",
      `Service updated for provider ${providerProfileId}`,
      {
        providerProfileId,
        serviceId,
        ip,
      },
    );
  }

  logServiceDeleted(providerProfileId: string, serviceId: string, ip?: string) {
    this.logger.info(
      "service_deleted",
      `Service deactivated for provider ${providerProfileId}`,
      {
        providerProfileId,
        serviceId,
        ip,
      },
    );
  }

  logServiceImageUploaded(
    providerProfileId: string,
    serviceId: string,
    imageId: string,
    ip?: string,
  ) {
    this.logger.info(
      "service_image_uploaded",
      `Image uploaded for service ${serviceId}`,
      { providerProfileId, serviceId, imageId, ip },
    );
  }

  logServiceImageDeleted(
    providerProfileId: string,
    serviceId: string,
    imageId: string,
    ip?: string,
  ) {
    this.logger.info(
      "service_image_deleted",
      `Image deleted for service ${serviceId}`,
      { providerProfileId, serviceId, imageId, ip },
    );
  }

  logCategoryCreated(name: string, ip?: string) {
    this.logger.info("category_created", `Category created: ${name}`, {
      name,
      ip,
    });
  }

  logCategoryUpdated(name: string, ip?: string) {
    this.logger.info("category_updated", `Category updated: ${name}`, {
      name,
      ip,
    });
  }

  logCategoryDeleted(name: string, ip?: string) {
    this.logger.info("category_deleted", `Category deleted: ${name}`, {
      name,
      ip,
    });
  }
}

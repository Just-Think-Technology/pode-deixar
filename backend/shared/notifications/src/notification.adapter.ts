// Notification adapter — Prisma-backed adapter implementing the notification port

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { NotificationsService } from "./notification.service";
import {
  INotificationPort,
  NotificationType,
  NotifyOptions,
} from "./notification.interface";

// --- Adapter Implementation ---

/**
 * Prisma adapter for the shared notification port.
 * Delegates to NotificationsService to keep a single home for business rules.
 * Services inject this adapter via the NOTIFICATION_PORT token or the class directly.
 */
@Injectable()
export class PrismaNotificationAdapter implements INotificationPort {
  constructor(private readonly core: NotificationsService) {}

  async notify(
    userIdOrOptions: string | NotifyOptions,
    type?: NotificationType | string,
    title?: string,
    message?: string,
    dedupKey?: string | null,
    ttl?: number,
  ): Promise<unknown | null> {
    if (typeof userIdOrOptions === "object" && userIdOrOptions !== null) {
      return this.core.notify(userIdOrOptions as NotifyOptions);
    }

    return this.core.notify(
      userIdOrOptions as string,
      type as string,
      title as string,
      message as string,
      dedupKey ?? null,
      ttl,
    );
  }

  // Convenience object form for services that prefer explicit DTOs
  async notifyWithOptions(options: NotifyOptions): Promise<unknown | null> {
    return this.core.notify(options);
  }
}

// Re-export helper for repository-level delegation without DI
export { NotificationsService } from "./notification.service";

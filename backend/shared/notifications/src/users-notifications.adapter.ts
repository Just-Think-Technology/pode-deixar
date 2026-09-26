// UsersNotificationsAdapter — explicit DB seam to users.notifications via shared DB

import { Injectable } from "@nestjs/common";
import { NotificationsService } from "./notification.service";
import {
  INotificationPort,
  NotificationType,
  NotifyOptions,
} from "./notification.interface";

// --- Adapter Implementation ---

/**
 * Explicit adapter for the shared DB seam to users.notifications table.
 * Keeps the shared Prisma DB seam (single schema) but makes it explicit
 * via the INotificationPort interface. Services (payments, reviews,
 * service-orders) inject this adapter via NOTIFICATION_PORT token instead
 * of directly calling prisma.notification.create.
 *
 * Delegates to the deep module (NotificationsService) to keep a single
 * home for dedup, P2002 and rate-limit handling.
 */
@Injectable()
export class UsersNotificationsAdapter implements INotificationPort {
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

  /**
   * Checks for a recent duplicate notification — exposed for repositories
   * that need explicit dedup checks before notify.
   * @param opts - Dedup lookup options
   * @returns True if duplicate exists
   */
  async existsRecent(opts: {
    userId: string;
    type: string;
    title: string;
    contractId?: string | null;
    conversationId?: string | null;
    windowMs?: number;
  }): Promise<boolean> {
    return this.core.existsRecent(opts);
  }

  /**
   * Convenience object form — delegates to core.
   * @param options - Notification options
   * @returns Created notification or null when duplicate or rate-limited
   */
  async notifyWithOptions(options: NotifyOptions): Promise<unknown | null> {
    return this.core.notify(options);
  }
}

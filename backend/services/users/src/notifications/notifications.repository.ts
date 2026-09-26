// Notifications repository — data access for notifications (deep module for users.notifications)

import { Inject, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { NotificationType } from "@prisma/client";
import {
  INotificationPort,
  NOTIFICATION_PORT,
} from "@pode-deixar/notifications";
import { NotificationsService } from "@pode-deixar/notifications";

// --- Types ---

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  conversationId?: string | null;
  contractId?: string | null;
}

export interface FindByUserOptions {
  type?: NotificationType;
  isRead?: boolean;
}

export interface ExistsRecentOptions {
  userId: string;
  type: NotificationType;
  title: string;
  contractId?: string | null;
  conversationId?: string | null;
  windowMs?: number;
}

// --- Repository Implementation ---

@Injectable()
export class NotificationsRepository {
  private readonly notificationsPort: INotificationPort;
  private readonly hasInjectedPort: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(NOTIFICATION_PORT)
    notificationsPort?: INotificationPort,
  ) {
    // Deep module owns prisma.notification reads/updates;
    // writes (create) delegate to explicit UsersNotificationsAdapter when injected,
    // keeping DB seam explicit via interface while retaining shared DB
    this.hasInjectedPort = !!notificationsPort;
    this.notificationsPort =
      notificationsPort ?? new NotificationsService(this.prisma);
  }

  /**
   * Creates a notification — when UsersNotificationsAdapter is injected, delegates
   * via INotificationPort to keep DB seam explicit (shared DB, interface makes it visible).
   * Fallback direct write is for contexts without DI (unit tests without module wiring)
   * and represents the deep module's authoritative write path.
   * @param data - Notification creation data
   * @returns Created notification or null when deduped via port
   */
  async create(data: CreateNotificationData) {
    if (this.hasInjectedPort) {
      const result = await this.notificationsPort.notify({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        contractId: data.contractId ?? null,
        conversationId: data.conversationId ?? null,
        dedupKey: data.contractId ?? data.conversationId ?? null,
        ttl: 60000,
      });
      if (result) {
        return result as Awaited<
          ReturnType<typeof this.prisma.notification.create>
        >;
      }
      // Port returned null (duplicate/rate-limited) — preserve prior create contract by returning null
      return null as unknown as Awaited<
        ReturnType<typeof this.prisma.notification.create>
      >;
    }

    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        conversationId: data.conversationId ?? null,
        contractId: data.contractId ?? null,
      },
    });
  }

  /**
   * Finds notifications for a user with optional filters, ordered by most recent first.
   * @param userId - Owner user id
   * @param opts - Optional filters by type and read state
   * @returns Notifications ordered by createdAt desc
   */
  findByUser(userId: string, opts?: FindByUserOptions) {
    const where: Record<string, unknown> = { userId };

    if (opts?.type) {
      where.type = opts.type;
    }

    if (opts?.isRead !== undefined) {
      where.isRead = opts.isRead;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Marks a single notification as read scoped to the owner.
   * @param id - Notification id
   * @param userId - Owner user id
   * @returns Prisma updateMany result with count
   */
  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Marks all unread notifications as read for a user.
   * @param userId - Owner user id
   * @returns Prisma updateMany result with count
   */
  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Counts unread notifications for a user.
   * @param userId - Owner user id
   * @returns Number of unread notifications
   */
  countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Checks if a recent notification exists within the dedup window.
   * Delegates to explicit UsersNotificationsAdapter — single home for dedup logic.
   * @param opts - Dedup lookup options
   * @returns True if a recent duplicate exists
   */
  async existsRecent(opts: ExistsRecentOptions): Promise<boolean> {
    const port = this.notificationsPort as unknown as {
      existsRecent?: (opts: ExistsRecentOptions) => Promise<boolean>;
    };
    if (port.existsRecent) {
      return port.existsRecent(opts);
    }
    return false;
  }
}

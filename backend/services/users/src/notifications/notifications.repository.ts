// Notifications repository — data access for notifications

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { NotificationType } from "@prisma/client";
import { NotificationsService as SharedNotificationsService } from "@pode-deixar/notifications";

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
  private readonly shared: SharedNotificationsService;

  constructor(private readonly prisma: PrismaService) {
    this.shared = new SharedNotificationsService(this.prisma);
  }

  /**
   * Creates a notification.
   * @param data - Notification creation data
   * @returns Created notification
   */
  create(data: CreateNotificationData) {
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
   * Delegates to shared notifications module — single home for dedup logic.
   * @param opts - Dedup lookup options
   * @returns True if a recent duplicate exists
   */
  async existsRecent(opts: ExistsRecentOptions): Promise<boolean> {
    return this.shared.existsRecent(opts);
  }
}

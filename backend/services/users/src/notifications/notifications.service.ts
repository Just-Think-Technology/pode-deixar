// Notifications service — business rules for notification lifecycle

import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import {
  NotificationsRepository,
  CreateNotificationData,
} from "./notifications.repository";
import {
  INotificationPort,
  NOTIFICATION_PORT,
} from "@pode-deixar/notifications";

// --- Types ---

export interface NotifyDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  conversationId?: string | null;
  contractId?: string | null;
}

export interface ListFilter {
  type?: NotificationType;
  isRead?: string;
}

// --- Service Implementation ---

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    @Optional()
    @Inject(NOTIFICATION_PORT)
    private readonly notificationsPort?: INotificationPort,
  ) {}

  /**
   * Creates a notification unless a duplicate exists within 60s window.
   * Delegates to shared notifications port when available — single home for
   * existsRecent + P2002 + rate-limit handling.
   * @param dto - Notification data
   * @returns Created notification or null when duplicate detected
   */
  async notify(dto: NotifyDto) {
    if (this.notificationsPort) {
      return this.notificationsPort.notify({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        dedupKey: dto.contractId ?? dto.conversationId ?? null,
        contractId: dto.contractId ?? null,
        conversationId: dto.conversationId ?? null,
        ttl: 60000,
      });
    }

    const isDuplicate = await this.repository.existsRecent({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      contractId: dto.contractId ?? null,
      conversationId: dto.conversationId ?? null,
      windowMs: 60000,
    });

    if (isDuplicate) {
      return null;
    }

    const data: CreateNotificationData = {
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      conversationId: dto.conversationId ?? null,
      contractId: dto.contractId ?? null,
    };

    return this.repository.create(data);
  }

  /**
   * Lists notifications for a user with optional filters.
   * @param userId - Owner user id
   * @param filter - Optional filters type and isRead
   * @returns Notifications ordered by createdAt desc
   */
  async list(userId: string, filter?: ListFilter) {
    const opts: { type?: NotificationType; isRead?: boolean } = {};

    if (filter?.type) {
      opts.type = filter.type;
    }

    if (filter?.isRead !== undefined) {
      opts.isRead = filter.isRead === "true";
    }

    return this.repository.findByUser(userId, opts);
  }

  /**
   * Marks a single notification as read; throws NotFound when no row affected.
   * @param userId - Owner user id
   * @param id - Notification id
   */
  async markRead(userId: string, id: string) {
    const result = await this.repository.markRead(id, userId);

    if (result.count === 0) {
      throw new NotFoundException("Notificação não encontrada");
    }

    return result;
  }

  /**
   * Marks all unread notifications as read for a user.
   * @param userId - Owner user id
   */
  async markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }

  /**
   * Counts unread notifications for a user.
   * @param userId - Owner user id
   * @returns Number of unread notifications
   */
  async countUnread(userId: string) {
    return this.repository.countUnread(userId);
  }

  // --- Backward-compatible aliases ---

  /**
   * Alias for notify, keeps previous create(userId, dto) contract.
   * @deprecated Use notify instead
   */
  async create(
    userId: string,
    dto: {
      type: NotificationType;
      title: string;
      message: string;
      conversationId?: string | null;
      contractId?: string | null;
    },
  ) {
    return this.notify({
      userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      conversationId: dto.conversationId ?? null,
      contractId: dto.contractId ?? null,
    });
  }

  /**
   * Alias for list with legacy pagination params (ignored).
   * @deprecated Use list instead
   */
  async findByRecipient(
    userId: string,
    _isRead?: boolean,
    _page?: number,
    _limit?: number,
  ) {
    const items = await this.list(userId);
    return { items, total: items.length, page: 1, totalPages: 1 };
  }

  /**
   * Alias for markRead with legacy arg order.
   * @deprecated Use markRead(userId, id) instead
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.markRead(userId, notificationId);
  }
}

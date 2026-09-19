// Notifications service — user notification delivery

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { toSkipTake } from "@pode-deixar/validation";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private repository: NotificationsRepository) {}

  // Recipient is always the authenticated user; ignore the client-supplied
  // recipient to prevent forged notifications to third parties.
  async create(userId: string, dto: CreateNotificationDto) {
    const notification = await this.repository.createNotification({
      userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      conversationId: (dto as any).conversationId ?? (dto as any).relatedId ?? null,
      contractId: (dto as any).contractId ?? null,
    });
    this.logger.log(`Notification created: ${notification.id} for ${userId}`);
    return notification;
  }

  async findByRecipient(
    recipient: string,
    isRead?: boolean,
    page = 1,
    limit = 20,
  ) {
    const where: any = { userId: recipient };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    const { skip } = toSkipTake({ page, limit });
    const [items, total] = await Promise.all([
      this.repository.findNotificationsByRecipient(where, skip, limit),
      this.repository.countNotificationsByRecipient(where),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(notificationId: string, userId: string) {
    // Only the recipient may mark the notification as read.
    const notification = await this.repository.findNotificationForRecipient(
      notificationId,
      userId,
    );

    if (!notification) {
      throw new BadRequestException(
        "Notificação não encontrada ou não pertence ao usuário",
      );
    }

    return this.repository.markNotificationAsRead(notificationId);
  }
}

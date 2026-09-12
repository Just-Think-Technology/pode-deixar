import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@Injectable()
// --- Public API ---
// Methods callable from the notifications controller.

export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  // Recipient is always the authenticated user; client-supplied recipient is
  // ignored to prevent forged notifications to third parties.
  async create(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        recipient: userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        relatedId: dto.relatedId,
        relatedType: dto.relatedType,
      },
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
    const where: any = { recipient };
    if (isRead !== undefined) {
      where.read = isRead;
    }
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(notificationId: string, userId: string) {
    // Only the recipient may mark the notification as read.
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipient: userId },
    });

    if (!notification) {
      throw new BadRequestException(
        "Notificação não encontrada ou não pertence ao usuário",
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }
}

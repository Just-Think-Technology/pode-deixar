import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { Prisma } from "@prisma/client";

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  conversationId?: string | null;
  contractId?: string | null;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: data as unknown as Prisma.NotificationCreateInput,
    });
  }

  findNotificationsByRecipient(where: any, skip: number, take: number) {
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  countNotificationsByRecipient(where: any) {
    return this.prisma.notification.count({ where });
  }

  findNotificationForRecipient(notificationId: number, userId: string) {
    return this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
  }

  markNotificationAsRead(notificationId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }
}

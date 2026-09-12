import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";

export interface CreateNotificationData {
  recipient: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(data: CreateNotificationData) {
    return this.prisma.notification.create({ data });
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

  findNotificationForRecipient(notificationId: string, userId: string) {
    return this.prisma.notification.findFirst({
      where: { id: notificationId, recipient: userId },
    });
  }

  markNotificationAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }
}

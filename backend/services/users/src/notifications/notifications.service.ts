import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  // O destinatário é sempre o usuário autenticado (userId): o valor
  // enviado pelo cliente em dto.recipient é ignorado para impedir que um
  // usuário crie notificações forjadas para terceiros.
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
    this.logger.log(`Notificação criada: ${notification.id} para ${userId}`);
    return notification;
  }

  async findByRecipient(
    recipient: string,
    lido?: boolean,
    page = 1,
    limit = 20,
  ) {
    const where: any = { recipient };
    if (lido !== undefined) {
      where.read = lido;
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
    // Verificação de segurança: apenas o destinatário pode marcar como lido
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

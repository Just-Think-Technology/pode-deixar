import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ServicesLoggerService } from "../shared/services-logger.service";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";

@Injectable()
export class ServiceOrdersService {
  constructor(
    private prisma: PrismaService,
    private logger: ServicesLoggerService,
  ) {}

  private formatOrder(order: any) {
    return {
      id: order.id,
      client_id: order.clientId,
      title: order.title,
      description: order.description,
      category: order.category,
      budget_min: order.budgetMin,
      budget_max: order.budgetMax,
      address: order.address,
      status: order.status,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };
  }

  async create(clientId: string, dto: CreateServiceOrderDto, ip?: string) {
    const order = await this.prisma.serviceOrder.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        budgetMin: dto.budgetMin ?? null,
        budgetMax: dto.budgetMax ?? null,
      },
    });

    this.logger.logServiceOrderCreated(clientId, order.id, ip);

    return this.formatOrder(order);
  }

  async findByClient(clientId: string) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  async findById(id: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: { proposals: true },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    return {
      ...this.formatOrder(order),
      proposals: order.proposals.map((p) => ({
        id: p.id,
        provider_id: p.providerId,
        price: p.price,
        description: p.description,
        estimated_duration: p.estimatedDuration,
        status: p.status,
        created_at: p.createdAt,
      })),
    };
  }

  async findOpenOrders() {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => this.formatOrder(o));
  }

  async update(
    clientId: string,
    orderId: string,
    dto: UpdateServiceOrderDto,
    ip?: string,
  ) {
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (existing.clientId !== clientId) {
      throw new BadRequestException("Pedido não pertence a este cliente");
    }

    if (existing.status !== "OPEN") {
      throw new BadRequestException(
        "Só é possível editar pedidos com status aberto",
      );
    }

    const order = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        category: dto.category ?? existing.category,
        budgetMin:
          dto.budgetMin !== undefined ? dto.budgetMin : existing.budgetMin,
        budgetMax:
          dto.budgetMax !== undefined ? dto.budgetMax : existing.budgetMax,
      },
    });

    this.logger.logServiceOrderUpdated(clientId, orderId, ip);

    return this.formatOrder(order);
  }

  async cancel(clientId: string, orderId: string, ip?: string) {
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (existing.clientId !== clientId) {
      throw new BadRequestException("Pedido não pertence a este cliente");
    }

    if (existing.status === "CANCELLED") {
      throw new BadRequestException("Pedido já está cancelado");
    }

    if (existing.status === "COMPLETED") {
      throw new BadRequestException(
        "Não é possível cancelar um pedido concluído",
      );
    }

    const order = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    this.logger.logServiceOrderCancelled(clientId, orderId, ip);

    return this.formatOrder(order);
  }
}

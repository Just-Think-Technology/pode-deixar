// Reviews service — order ratings and comments

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma, ServiceOrder } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReviewsLoggerService } from "../shared/reviews-logger.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

const EDIT_WINDOW_MINUTES = 5;
const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_REVIEW_LIMIT = 50;
const MAX_REVIEW_LIMIT = 50;
const MIN_REVIEW_LIMIT = 1;

interface OrderForReview {
  clientId: string;
  providerId: string | null;
}

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private logger: ReviewsLoggerService,
  ) {}

  // --- Private Helpers ---

  private formatReview(review: {
    id: string;
    serviceOrderId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReviewFormat {
    return {
      id: review.id,
      service_order_id: review.serviceOrderId,
      reviewer_id: review.reviewerId,
      reviewee_id: review.revieweeId,
      rating: review.rating,
      comment: review.comment ?? null,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    };
  }

  private async recalculateRating(
    revieweeId: string,
    tx: Prisma.TransactionClient,
  ) {
    const aggregate = await tx.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const rating = aggregate._avg.rating ?? 0;
    const totalReviews = aggregate._count._all;

    await tx.providerProfile.updateMany({
      where: { userId: revieweeId },
      data: { rating, totalReviews },
    });

    await tx.clientProfile.updateMany({
      where: { userId: revieweeId },
      data: { rating, totalReviews },
    });
  }

  private resolveReviewee(order: OrderForReview, reviewerId: string): string {
    if (order.clientId === reviewerId) {
      if (!order.providerId) {
        throw new BadRequestException("Pedido sem prestador definido");
      }
      return order.providerId;
    }

    if (order.providerId === reviewerId) {
      return order.clientId;
    }

    throw new ForbiddenException("Você não é parte deste pedido");
  }

  // --- Public API ---

  /**
   * Creates a review for a completed, paid order.
   * Each side reviews once; races on the unique constraint collapse into
   * the same duplicate error.
   */
  async create(reviewerId: string, dto: CreateReviewDto, ip?: string) {
    const order = await this.findCompletedOrderOrThrow(dto.serviceOrderId);
    await this.assertPaidOrder(order.id);
    const revieweeId = this.resolveReviewee(order, reviewerId);
    await this.assertNoExistingReview(order.id, reviewerId);

    try {
      const review = await this.persistReview(
        order.id,
        reviewerId,
        revieweeId,
        dto,
      );

      this.logger.logReviewCreated(
        reviewerId,
        review.id,
        order.id,
        revieweeId,
        ip,
      );

      return this.formatReview(review);
    } catch (e) {
      // Duck-typed code check (same as payments attemptTransaction): Prisma
      // throws instances, but callers may surface plain error objects.
      const code =
        e instanceof Prisma.PrismaClientKnownRequestError
          ? e.code
          : (e as { code?: unknown } | null)?.code;
      if (code === "P2002") {
        throw new BadRequestException("Você já avaliou este pedido");
      }
      throw e;
    }
  }

  private async findCompletedOrderOrThrow(serviceOrderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });
    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }
    if (order.status !== "COMPLETED") {
      throw new BadRequestException("Só é possível avaliar pedidos concluídos");
    }
    return order;
  }

  private async assertPaidOrder(serviceOrderId: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { serviceOrderId, status: "PAID" },
    });
    if (!payment) {
      throw new BadRequestException(
        "A avaliação exige pagamento confirmado do pedido",
      );
    }
  }

  private async assertNoExistingReview(
    serviceOrderId: string,
    reviewerId: string,
  ): Promise<void> {
    const existingReview = await this.prisma.review.findUnique({
      where: { serviceOrderId_reviewerId: { serviceOrderId, reviewerId } },
    });
    if (existingReview) {
      throw new BadRequestException("Você já avaliou este pedido");
    }
  }

  private async persistReview(
    serviceOrderId: string,
    reviewerId: string,
    revieweeId: string,
    dto: CreateReviewDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          serviceOrderId,
          reviewerId,
          revieweeId,
          rating: dto.rating,
          comment: dto.comment ?? null,
        },
      });

      await this.recalculateRating(revieweeId, tx);

      return created;
    });
  }

  async findMine(reviewerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { reviewerId },
      orderBy: { createdAt: "desc" },
    });

    return reviews.map((r) => this.formatReview(r));
  }

  // Public listing is capped to deter scraping.
  async findByProvider(providerId: string, limit?: number) {
    const take = Math.min(
      Math.max(limit ?? DEFAULT_REVIEW_LIMIT, MIN_REVIEW_LIMIT),
      MAX_REVIEW_LIMIT,
    );
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: providerId },
      orderBy: { createdAt: "desc" },
      take,
    });

    return reviews.map((r) => this.formatReview(r));
  }

  async findByOrder(orderId: string, userId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.clientId !== userId && order.providerId !== userId) {
      throw new ForbiddenException("Você não é parte deste pedido");
    }

    const reviews = await this.prisma.review.findMany({
      where: { serviceOrderId: orderId },
      orderBy: { createdAt: "desc" },
    });

    return reviews.map((r) => this.formatReview(r));
  }

  async update(
    reviewerId: string,
    reviewId: string,
    dto: UpdateReviewDto,
    ip?: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Avaliação não encontrada");
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException("Você não pode editar esta avaliação");
    }

    const editDeadline =
      review.createdAt.getTime() + EDIT_WINDOW_MINUTES * MS_PER_MINUTE;

    if (Date.now() > editDeadline) {
      throw new BadRequestException(
        "Avaliação só pode ser editada nos primeiros 5 minutos",
      );
    }

    if (dto.rating === undefined && dto.comment === undefined) {
      throw new BadRequestException("Informe ao menos um campo para atualizar");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const edited = await tx.review.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating ?? review.rating,
          comment: dto.comment !== undefined ? dto.comment : review.comment,
        },
      });

      await this.recalculateRating(review.revieweeId, tx);

      return edited;
    });

    this.logger.logReviewUpdated(reviewerId, reviewId, ip);

    return this.formatReview(updated);
  }

  async remove(reviewerId: string, reviewId: string, ip?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Avaliação não encontrada");
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException("Você não pode excluir esta avaliação");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });

      await this.recalculateRating(review.revieweeId, tx);
    });

    this.logger.logReviewDeleted(reviewerId, reviewId, ip);

    return { message: "Avaliação excluída com sucesso" };
  }
}

export interface ReviewFormat {
  id: string;
  service_order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
}

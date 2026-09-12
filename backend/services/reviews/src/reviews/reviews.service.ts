import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ReviewsRepository } from "./reviews.repository";
import { ReviewsLoggerService } from "../shared/reviews-logger.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

const EDIT_WINDOW_MINUTES = 5;
const MS_PER_MINUTE = 60 * 1000;

interface OrderForReview {
  clientId: string;
  providerId: string | null;
}

@Injectable()
export class ReviewsService {
  constructor(
    private repository: ReviewsRepository,
    private logger: ReviewsLoggerService,
  ) {}

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

  async create(reviewerId: string, dto: CreateReviewDto, ip?: string) {
    const order = await this.repository.findOrderById(dto.serviceOrderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.status !== "COMPLETED") {
      throw new BadRequestException("Só é possível avaliar pedidos concluídos");
    }

    const payment = await this.repository.findPaidPaymentByOrderId(order.id);

    if (!payment) {
      throw new BadRequestException(
        "A avaliação exige pagamento confirmado do pedido",
      );
    }

    const revieweeId = this.resolveReviewee(order, reviewerId);

    const existingReview = await this.repository.findReviewByOrderAndReviewer(
      order.id,
      reviewerId,
    );

    if (existingReview) {
      throw new BadRequestException("Você já avaliou este pedido");
    }

    try {
      const review = await this.repository.createReview({
        serviceOrderId: order.id,
        reviewerId,
        revieweeId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      });

      this.logger.logReviewCreated(
        reviewerId,
        review.id,
        order.id,
        revieweeId,
        ip,
      );

      return this.formatReview(review);
    } catch (e: any) {
      if (e?.code === "P2002") {
        throw new BadRequestException("Você já avaliou este pedido");
      }
      throw e;
    }
  }

  async findMine(reviewerId: string) {
    const reviews = await this.repository.findReviewsByReviewer(reviewerId);

    return reviews.map((r) => this.formatReview(r));
  }

  // Public listing is capped to deter scraping.
  async findByProvider(providerId: string, limit?: number) {
    const take = Math.min(Math.max(limit ?? 50, 1), 50);
    const reviews = await this.repository.findReviewsByReviewee(
      providerId,
      take,
    );

    return reviews.map((r) => this.formatReview(r));
  }

  async findByOrder(orderId: string, userId: string) {
    const order = await this.repository.findOrderById(orderId);

    if (!order) {
      throw new NotFoundException("Pedido de serviço não encontrado");
    }

    if (order.clientId !== userId && order.providerId !== userId) {
      throw new ForbiddenException("Você não é parte deste pedido");
    }

    const reviews = await this.repository.findReviewsByOrder(orderId);

    return reviews.map((r) => this.formatReview(r));
  }

  async update(
    reviewerId: string,
    reviewId: string,
    dto: UpdateReviewDto,
    ip?: string,
  ) {
    const review = await this.repository.findReviewById(reviewId);

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

    const updated = await this.repository.updateReview(
      reviewId,
      review.revieweeId,
      {
        rating: dto.rating ?? review.rating,
        comment: dto.comment !== undefined ? dto.comment : review.comment,
      },
    );

    this.logger.logReviewUpdated(reviewerId, reviewId, ip);

    return this.formatReview(updated);
  }

  async remove(reviewerId: string, reviewId: string, ip?: string) {
    const review = await this.repository.findReviewById(reviewId);

    if (!review) {
      throw new NotFoundException("Avaliação não encontrada");
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException("Você não pode excluir esta avaliação");
    }

    await this.repository.deleteReview(reviewId, review.revieweeId);

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

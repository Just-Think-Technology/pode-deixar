// Reviews service — order ratings and comments

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
import { FindByProviderQueryDto } from "./dto/find-by-provider-query.dto";
import { toSkipTake } from "@pode-deixar/validation";

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

      // Notify reviewee (provider) — deduped via existsRecent, failure must not block creation
      try {
        const orderForNotify = await this.repository.findOrderForNotification(
          order.id,
        );
        const title = orderForNotify
          ? `Nova avaliação para "${orderForNotify.title}"`
          : "Nova avaliação";
        await this.repository.notify({
          userId: revieweeId,
          type: "SERVICE",
          title: "Nova avaliação",
          message: title,
          contractId: order.id,
        });
      } catch {
        // Notification failure must not block review creation
      }

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

  // Provider listing — paginated, COMPLETED+PAID only, privacy-shaped, IDs hidden
  async findByProvider(providerId: string, query?: FindByProviderQueryDto) {
    const providerUserId =
      await this.repository.resolveProviderUserId(providerId);
    if (!providerUserId) {
      throw new NotFoundException("Prestador não encontrado");
    }

    const page = Math.floor(query?.page ?? 1);
    const requestedLimit = query?.limit ?? 10;
    const { skip, take } = toSkipTake({ page, limit: requestedLimit }, 10);
    const safePage = page < 1 || !Number.isFinite(page) ? 1 : page;

    const total = await this.repository.countFilteredReviews(providerUserId);

    if (total === 0) {
      return {
        data: [],
        meta: { total: 0, page: safePage, limit: take, hasMore: false },
      };
    }

    const reviews = await this.repository.findFilteredReviews(
      providerUserId,
      skip,
      take,
    );

    const reviewerIds = [...new Set(reviews.map((r) => r.reviewerId))];
    const { userMap, avatarMap } =
      await this.repository.findReviewerProfiles(reviewerIds);

    const data = reviews.map((r) => {
      const fullName = userMap.get(r.reviewerId) ?? null;
      const displayName = this.repository.formatDisplayName(fullName);
      const avatarUrl = avatarMap.get(r.reviewerId) ?? null;
      const response = (r as any).response as
        { message: string; createdAt: Date } | null | undefined;
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        created_at: r.createdAt,
        reviewer: { display_name: displayName, avatar_url: avatarUrl },
        response: response
          ? { message: response.message, created_at: response.createdAt }
          : null,
      };
    });

    const hasMore = skip + take < total;

    return {
      data,
      meta: { total, page: safePage, limit: take, hasMore },
    };
  }

  // Provider summary — aggregate+groupBy on revieweeId, filter COMPLETED+PAID
  async getProviderSummary(providerId: string) {
    const providerUserId =
      await this.repository.resolveProviderUserId(providerId);
    if (!providerUserId) {
      throw new NotFoundException("Prestador não encontrado");
    }

    const [aggregate, groups] = await Promise.all([
      this.repository.aggregateFilteredReviews(providerUserId),
      this.repository.groupByRatingFiltered(providerUserId),
    ]);

    const total = aggregate._count._all;
    const average = total === 0 ? null : (aggregate._avg.rating ?? null);

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const g of groups as Array<{
      rating: number;
      _count: { rating: number };
    }>) {
      distribution[g.rating] = g._count.rating;
    }

    return {
      provider_id: providerId,
      average,
      total,
      distribution,
    };
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

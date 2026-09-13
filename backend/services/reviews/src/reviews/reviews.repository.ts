import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { Prisma } from "@prisma/client";

export interface CreateReviewData {
  serviceOrderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
}

export interface UpdateReviewData {
  rating: number;
  comment: string | null;
}

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrderById(orderId: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
  }

  findPaidPaymentByOrderId(orderId: string) {
    return this.prisma.payment.findFirst({
      where: { serviceOrderId: orderId, status: "PAID" },
    });
  }

  findReviewByOrderAndReviewer(orderId: string, reviewerId: string) {
    return this.prisma.review.findUnique({
      where: {
        serviceOrderId_reviewerId: { serviceOrderId: orderId, reviewerId },
      },
    });
  }

  findReviewById(reviewId: string) {
    return this.prisma.review.findUnique({ where: { id: reviewId } });
  }

  findReviewsByReviewer(reviewerId: string) {
    return this.prisma.review.findMany({
      where: { reviewerId },
      orderBy: { createdAt: "desc" },
    });
  }

  findReviewsByReviewee(revieweeId: string, take: number) {
    return this.prisma.review.findMany({
      where: { revieweeId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  findReviewsByOrder(orderId: string) {
    return this.prisma.review.findMany({
      where: { serviceOrderId: orderId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async recalculateRating(revieweeId: string, tx: TransactionClient) {
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

  createReview(data: CreateReviewData) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({ data });
      await this.recalculateRating(data.revieweeId, tx);
      return created;
    });
  }

  updateReview(reviewId: string, revieweeId: string, data: UpdateReviewData) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data,
      });
      await this.recalculateRating(revieweeId, tx);
      return updated;
    });
  }

  deleteReview(reviewId: string, revieweeId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });
      await this.recalculateRating(revieweeId, tx);
    });
  }
}

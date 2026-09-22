// Reviews repository — order ratings and deduped notifications

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

  // --- Provider summary and listing (COMPLETED+PAID only) ---

  async resolveProviderUserId(providerId: string): Promise<string | null> {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });
    if (profile) {
      return profile.userId;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true },
    });
    if (user) {
      return user.id;
    }
    return null;
  }

  private filteredWhere(revieweeUserId: string) {
    return {
      revieweeId: revieweeUserId,
      serviceOrder: {
        status: "COMPLETED" as const,
        payments: { some: { status: "PAID" as const } },
      },
    };
  }

  countFilteredReviews(revieweeUserId: string) {
    return this.prisma.review.count({
      where: this.filteredWhere(revieweeUserId),
    });
  }

  aggregateFilteredReviews(revieweeUserId: string) {
    return this.prisma.review.aggregate({
      where: this.filteredWhere(revieweeUserId),
      _avg: { rating: true },
      _count: { _all: true },
    });
  }

  groupByRatingFiltered(revieweeUserId: string) {
    return this.prisma.review.groupBy({
      by: ["rating"],
      where: this.filteredWhere(revieweeUserId),
      _count: { rating: true },
    });
  }

  findFilteredReviews(revieweeUserId: string, skip: number, take: number) {
    return this.prisma.review.findMany({
      where: this.filteredWhere(revieweeUserId),
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { response: true },
    });
  }

  async findReviewerProfiles(reviewerIds: string[]) {
    if (reviewerIds.length === 0) {
      return {
        userMap: new Map<string, string>(),
        avatarMap: new Map<string, string | null>(),
      };
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: reviewerIds } },
      select: { id: true, completeName: true },
    });
    const clientProfiles = await this.prisma.clientProfile.findMany({
      where: { userId: { in: reviewerIds } },
      select: { userId: true, avatarUrl: true },
    });
    const userMap = new Map<string, string>(
      users.map((u) => [u.id, u.completeName]),
    );
    const avatarMap = new Map<string, string | null>(
      clientProfiles.map((p) => [p.userId, p.avatarUrl]),
    );
    return { userMap, avatarMap };
  }

  // Privacy helper — first name + initial from completeName, avatar from ClientProfile
  formatDisplayName(fullName: string | null | undefined): string {
    const normalized = fullName?.trim();
    if (!normalized) {
      return "Cliente";
    }
    const parts = normalized.split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
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

  // --- Notification helpers with anti-duplicate ---

  async existsRecent(opts: {
    userId: string;
    type: string;
    title: string;
    contractId?: string | null;
    windowMs?: number;
  }): Promise<boolean> {
    const windowMs = opts.windowMs ?? 60000;
    const since = new Date(Date.now() - windowMs);
    const where: Record<string, unknown> = {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      createdAt: { gte: since },
    };
    if (opts.contractId) {
      where.contractId = opts.contractId;
    }
    const existing = await this.prisma.notification.findFirst({ where });
    return Boolean(existing);
  }

  async notify(dto: {
    userId: string;
    type: string;
    title: string;
    message: string;
    contractId?: string | null;
  }) {
    const isDuplicate = await this.existsRecent({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      contractId: dto.contractId ?? null,
      windowMs: 60000,
    });
    if (isDuplicate) {
      return null;
    }
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        contractId: dto.contractId ?? null,
      },
    });
  }

  findOrderForNotification(orderId: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      select: { id: true, title: true },
    });
  }

  // --- Review responses ---

  findReviewResponseByReviewId(reviewId: string) {
    return this.prisma.reviewResponse.findUnique({
      where: { reviewId },
    });
  }

  createReviewResponse(reviewId: string, message: string) {
    return this.prisma.reviewResponse.create({
      data: { reviewId, message },
    });
  }

  updateReviewResponse(reviewId: string, message: string) {
    return this.prisma.reviewResponse.update({
      where: { reviewId },
      data: { message },
    });
  }

  // --- Review reports ---

  findReviewReport(reviewId: string, reporterId: string) {
    return this.prisma.reviewReport.findUnique({
      where: { reviewId_reporterId: { reviewId, reporterId } },
    });
  }

  findReportsByReporter(reviewIds: string[], reporterId: string) {
    if (reviewIds.length === 0) {
      return Promise.resolve(
        [] as Awaited<ReturnType<typeof this.prisma.reviewReport.findMany>>,
      );
    }
    return this.prisma.reviewReport.findMany({
      where: { reviewId: { in: reviewIds }, reporterId },
    });
  }

  createReviewReport(data: {
    reviewId: string;
    reporterId: string;
    reason: string;
    description?: string | null;
  }) {
    return this.prisma.reviewReport.create({
      data: {
        reviewId: data.reviewId,
        reporterId: data.reporterId,
        reason: data.reason as any,
        description: data.description ?? null,
      },
    });
  }
}

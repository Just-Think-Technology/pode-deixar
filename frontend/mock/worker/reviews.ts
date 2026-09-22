// Worker reviews mocks — seeded received reviews for manual testing

import type {
  MyReview,
  ReportReviewPayload,
} from "@/lib/worker/reviews/types";

// In-memory store so reply/report actions persist during manual testing
let mockReceivedReviews: MyReview[] = [
  {
    id: "wr1",
    rating: 5,
    comment: "Prestador muito profissional, pontual e cuidadoso.",
    createdAt: "2026-09-12T10:00:00.000Z",
    reviewer: { displayName: "Carlos M.", avatarUrl: null },
    response: null,
    reportStatus: "NONE",
  },
  {
    id: "wr2",
    rating: 4,
    comment: "Bom trabalho, chegou um pouco atrasado mas o acabamento compensou.",
    createdAt: "2026-09-08T14:30:00.000Z",
    reviewer: { displayName: "Ana P.", avatarUrl: null },
    response: {
      message: "Obrigado pelo feedback, Ana! Vou me atentar ao horário.",
      createdAt: "2026-09-09T09:00:00.000Z",
    },
    reportStatus: "NONE",
  },
  {
    id: "wr3",
    rating: 1,
    comment: "Esse cara é um idiota, serviço de merda, não contratem esse lixo.",
    createdAt: "2026-09-05T11:20:00.000Z",
    reviewer: { displayName: "João R.", avatarUrl: null },
    response: null,
    reportStatus: "NONE",
  },
  {
    id: "wr4",
    rating: 2,
    comment: "Não gostei, fez tudo errado de propósito para me prejudicar.",
    createdAt: "2026-09-01T16:45:00.000Z",
    reviewer: { displayName: "Marcos V.", avatarUrl: null },
    response: null,
    reportStatus: "PENDING",
  },
  {
    id: "wr5",
    rating: 5,
    comment: null,
    createdAt: "2026-08-28T10:10:00.000Z",
    reviewer: { displayName: "Fernanda L.", avatarUrl: null },
    response: null,
    reportStatus: "NONE",
  },
];

export function mockGetMyReviews(): MyReview[] {
  return mockReceivedReviews.map((review) => ({ ...review }));
}

export function mockReplyToReview(
  reviewId: string,
  message: string,
): MyReview | null {
  mockReceivedReviews = mockReceivedReviews.map((review) =>
    review.id === reviewId
      ? {
          ...review,
          response: { message, createdAt: new Date().toISOString() },
        }
      : review,
  );

  return (
    mockReceivedReviews.find((review) => review.id === reviewId) ?? null
  );
}

export function mockReportReview(
  reviewId: string,
  _payload: ReportReviewPayload,
): void {
  mockReceivedReviews = mockReceivedReviews.map((review) =>
    review.id === reviewId ? { ...review, reportStatus: "PENDING" } : review,
  );
}

export function resetMockWorkerReviews(): void {
  mockReceivedReviews = mockReceivedReviews.map((review) => ({
    ...review,
    response:
      review.id === "wr2"
        ? {
            message: "Obrigado pelo feedback, Ana! Vou me atentar ao horário.",
            createdAt: "2026-09-09T09:00:00.000Z",
          }
        : null,
    reportStatus: review.id === "wr4" ? "PENDING" : "NONE",
  }));
}

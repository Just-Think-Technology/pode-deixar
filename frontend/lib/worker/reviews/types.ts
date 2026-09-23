// Worker reviews types — received reviews, replies, and reports

import type {
  ProviderReview,
  RawProviderReview,
} from "@/lib/client/reviews/types";

export type ReviewResponse = {
  message: string;
  createdAt: string;
};

export type ReportStatus = "NONE" | "PENDING" | "RESOLVED";

export type ReportReason =
  | "OFENSA"
  | "PALAVRAO"
  | "PREJUDICAR"
  | "SPAM"
  | "OUTRO";

export type MyReview = ProviderReview & {
  response: ReviewResponse | null;
  reportStatus: ReportStatus;
};

export type RawReviewResponse = {
  message: string;
  created_at: string;
} | null;

export type RawMyReview = RawProviderReview & {
  response?: RawReviewResponse;
  report_status?: ReportStatus | null;
};

export type ReplyToReviewPayload = {
  message: string;
};

export type ReportReviewPayload = {
  reason: ReportReason;
  description?: string;
};

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "OFENSA", label: "Ofensa ou intuito de prejudicar" },
  { value: "PALAVRAO", label: "Palavrões ou baixo calão" },
  { value: "PREJUDICAR", label: "Conteúdo falso para me prejudicar" },
  { value: "SPAM", label: "Spam ou propaganda" },
  { value: "OUTRO", label: "Outro motivo" },
];

export const MAX_RESPONSE_LENGTH = 500;

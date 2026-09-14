// Contract tracking types — shared tracking shapes for client and provider

export type TrackingRole = "CLIENT" | "PROVIDER";

export type ContractStatus =
  | "AWAITING_PAYMENT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TimelineEventState = "done" | "current" | "pending" | "cancelled";

export type TimelineEventKey =
  | "REQUEST_SENT"
  | "PROPOSAL_SENT"
  | "PROPOSAL_ACCEPTED"
  | "PAYMENT_CONFIRMED"
  | "SERVICE_SCHEDULED"
  | "SERVICE_STARTED"
  | "SERVICE_COMPLETED"
  | "EVIDENCES_ADDED"
  | "REVIEW_SUBMITTED";

export type TrackingAddress = {
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

export type TrackingCounterpart = {
  id: string;
  completeName: string;
  avatarUrl: string | null;
};

export type TrackingProposal = {
  id: string;
  providerId: string;
  price: number;
  description: string;
  estimatedDuration: string | null;
  acceptedAt: string | null;
};

export type TrackingPayment = {
  id: string | null;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  method: "PIX" | "CREDIT_CARD" | null;
  amount: number | null;
  paidAt: string | null;
};

export type TrackingEvidencePhoto = {
  id: string;
  url: string;
};

export type TrackingEvidence = {
  completedAt: string;
  completedBy: string;
  observations: string | null;
  photos: TrackingEvidencePhoto[];
};

export type TrackingReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type ContractTracking = {
  orderId: string;
  title: string;
  description: string;
  categoryName: string | null;
  orderStatus: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  role: TrackingRole;
  counterpart: TrackingCounterpart;
  scheduledAt: string | null;
  scheduledEndAt: string | null;
  startedAt: string | null;
  address: TrackingAddress;
  grossAmount: number | null;
  feeAmount: number | null;
  netAmount: number | null;
  proposal: TrackingProposal | null;
  payment: TrackingPayment;
  evidence: TrackingEvidence | null;
  review: TrackingReview | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
};

export type TimelineEvent = {
  key: TimelineEventKey;
  state: TimelineEventState;
  occurredAt: string | null;
  description: string | null;
  actorName: string | null;
};

export type TrackingActions = {
  canPay: boolean;
  canStart: boolean;
  canFinish: boolean;
  canReview: boolean;
  canViewEvidence: boolean;
};

export type SubmitReviewInput = {
  rating: number;
  comment?: string;
};

export type SubmitReviewResult = TrackingReview;

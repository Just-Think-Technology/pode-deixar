// Timeline builder — derives official status, events and actions from tracking data

import type {
  ContractStatus,
  ContractTracking,
  TimelineEvent,
  TimelineEventKey,
  TrackingActions,
} from "@/lib/tracking/types";

const CANONICAL_EVENT_ORDER: TimelineEventKey[] = [
  "REQUEST_SENT",
  "PROPOSAL_SENT",
  "PROPOSAL_ACCEPTED",
  "PAYMENT_CONFIRMED",
  "SERVICE_SCHEDULED",
  "SERVICE_STARTED",
  "SERVICE_COMPLETED",
  "EVIDENCES_ADDED",
  "REVIEW_SUBMITTED",
];

function isDirectHire(tracking: ContractTracking): boolean {
  return tracking.orderStatus !== "OPEN" && tracking.proposal == null;
}

function backendOccurredAt(
  tracking: ContractTracking,
  key: TimelineEventKey,
): string | null {
  const entry = tracking.timeline?.find((item) => item.key === key);
  return entry?.occurredAt ?? null;
}

function eventOccurred(
  tracking: ContractTracking,
  key: TimelineEventKey,
): boolean {
  // A backend timeline entry marks the event done even when the
  // derived flags disagree (authoritative write-time wins).
  if (backendOccurredAt(tracking, key) != null) {
    return true;
  }
  switch (key) {
    case "REQUEST_SENT":
      return tracking.createdAt != null;
    case "PROPOSAL_SENT":
      return tracking.proposal != null;
    case "PROPOSAL_ACCEPTED":
      return tracking.proposal?.acceptedAt != null;
    case "PAYMENT_CONFIRMED":
      return tracking.payment.status === "PAID";
    case "SERVICE_SCHEDULED":
      return tracking.scheduledAt != null;
    case "SERVICE_STARTED":
      return tracking.startedAt != null;
    case "SERVICE_COMPLETED":
      return tracking.orderStatus === "COMPLETED";
    case "EVIDENCES_ADDED":
      return (tracking.evidence?.photos.length ?? 0) > 0;
    case "REVIEW_SUBMITTED":
      return tracking.review != null;
  }
}

function eventOccurredAt(
  tracking: ContractTracking,
  key: TimelineEventKey,
): string | null {
  // Prefer the authoritative backend timestamp when the DB timeline
  // recorded this event; fall back to deriving it from status flags
  // for older orders and mocks without a timeline.
  const authoritative = backendOccurredAt(tracking, key);
  if (authoritative != null) {
    return authoritative;
  }
  switch (key) {
    case "REQUEST_SENT":
      return tracking.createdAt;
    case "PROPOSAL_SENT":
      return tracking.proposal?.acceptedAt ?? tracking.createdAt;
    case "PROPOSAL_ACCEPTED":
      return tracking.proposal?.acceptedAt ?? null;
    case "PAYMENT_CONFIRMED":
      return tracking.payment.paidAt;
    case "SERVICE_SCHEDULED":
      return tracking.scheduledAt;
    case "SERVICE_STARTED":
      return tracking.startedAt;
    case "SERVICE_COMPLETED":
      return tracking.evidence?.completedAt ?? tracking.scheduledEndAt;
    case "EVIDENCES_ADDED":
      return tracking.evidence?.completedAt ?? null;
    case "REVIEW_SUBMITTED":
      return tracking.review?.createdAt ?? null;
  }
}

function eventActor(
  tracking: ContractTracking,
  key: TimelineEventKey,
): string | null {
  const viewer = "Você";
  switch (key) {
    case "REQUEST_SENT":
    case "PROPOSAL_ACCEPTED":
    case "PAYMENT_CONFIRMED":
    case "REVIEW_SUBMITTED":
      return tracking.role === "CLIENT" ? viewer : tracking.counterpart.completeName;
    case "PROPOSAL_SENT":
    case "SERVICE_STARTED":
    case "SERVICE_COMPLETED":
    case "EVIDENCES_ADDED":
      return tracking.role === "PROVIDER" ? viewer : tracking.counterpart.completeName;
    default:
      return null;
  }
}

/** Official 5-status derivation from order state, payment and scheduling. */
export function deriveContractStatus(
  tracking: ContractTracking,
): ContractStatus {
  if (tracking.orderStatus === "CANCELLED") {
    return "CANCELLED";
  }
  if (tracking.orderStatus === "COMPLETED") {
    return "COMPLETED";
  }
  if (tracking.payment.status !== "PAID") {
    return "AWAITING_PAYMENT";
  }
  if (tracking.startedAt != null) {
    return "IN_PROGRESS";
  }
  return "SCHEDULED";
}

function applicableEvents(tracking: ContractTracking): TimelineEventKey[] {
  return CANONICAL_EVENT_ORDER.filter((key) => {
    if (
      isDirectHire(tracking) &&
      (key === "PROPOSAL_SENT" || key === "PROPOSAL_ACCEPTED")
    ) {
      return false;
    }
    if (tracking.orderStatus === "CANCELLED" && key === "REVIEW_SUBMITTED") {
      return false;
    }
    return true;
  });
}

/** Builds the timeline with done/current/pending states for both profiles. */
export function buildTimelineEvents(
  tracking: ContractTracking,
): TimelineEvent[] {
  const keys = applicableEvents(tracking);
  const doneKeys = new Set(keys.filter((key) => eventOccurred(tracking, key)));
  const firstPendingIndex = keys.findIndex((key) => !doneKeys.has(key));
  const isCancelled = tracking.orderStatus === "CANCELLED";

  return keys.map((key, index) => {
    if (doneKeys.has(key)) {
      return {
        key,
        state: "done" as const,
        occurredAt: eventOccurredAt(tracking, key),
        description: null,
        actorName: eventActor(tracking, key),
      };
    }
    if (isCancelled && index === firstPendingIndex) {
      return {
        key,
        state: "cancelled" as const,
        occurredAt: null,
        description: "Interrompido pelo cancelamento.",
        actorName: null,
      };
    }
    return {
      key,
      state: (index === firstPendingIndex
        ? "current"
        : "pending") as TimelineEvent["state"],
      occurredAt: null,
      description: null,
      actorName: null,
    };
  });
}

/** Role- and status-based action visibility shared by both profiles. */
export function getAvailableActions(
  tracking: ContractTracking,
): TrackingActions {
  const status = deriveContractStatus(tracking);
  const isClient = tracking.role === "CLIENT";
  const isProvider = tracking.role === "PROVIDER";

  return {
    canPay: isClient && status === "AWAITING_PAYMENT",
    canStart: isProvider && status === "SCHEDULED",
    canFinish: isProvider && status === "IN_PROGRESS",
    canReview: isClient && status === "COMPLETED" && tracking.review == null,
    canViewEvidence:
      tracking.evidence != null && (status === "COMPLETED" || isProvider),
  };
}

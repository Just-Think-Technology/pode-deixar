// Service order mappers — pure formatting helpers for orders and proposals

import {
  formatAddress,
  formatAddressSummary,
} from "../dto/service-order-address.dto";

// --- Number helpers ---

/**
 * Converts Prisma Decimal or unknown numeric value to number.
 *
 * @param value - Unknown value from Prisma (Decimal with toNumber) or plain number
 * @returns Number or null when conversion is not possible
 */
export function toNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  const decimal = value as { toNumber?: () => number };
  if (typeof decimal.toNumber === "function") {
    return decimal.toNumber();
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// --- Order formatting ---

export function formatOrder(order: any) {
  return {
    id: order.id,
    client_id: order.clientId,
    provider_id: order.providerId ?? null,
    provider_service_id: order.providerServiceId ?? null,
    agreed_price: order.agreedPrice ?? null,
    title: order.title,
    description: order.description,
    category_id: order.categoryId,
    category: order.category
      ? {
          id: order.category.id,
          name: order.category.name,
          slug: order.category.slug,
        }
      : null,
    budget_min: order.budgetMin,
    budget_max: order.budgetMax,
    address: formatAddress(order.address),
    status: order.status,
    scheduled_at: order.scheduledAt ?? null,
    scheduled_end_at: order.scheduledEndAt ?? null,
    completed_at: order.completedAt ?? null,
    completed_by: order.completedBy ?? null,
    observations: order.observations ?? null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

export function formatPhotos(photos: any[] | undefined) {
  return (photos ?? []).map((p: any) => ({
    id: p.id,
    url: `/api/services/photos/${p.id}/view`,
    created_at: p.createdAt ?? undefined,
  }));
}

export function formatCompletionHistory(order: any, photos: any[]) {
  return {
    order_id: order.id,
    completed_at: order.completedAt ? order.completedAt.toISOString() : null,
    completed_by: order.completedBy ?? null,
    observations: order.observations ?? null,
    photos: photos.map((p: any) => ({
      id: p.id,
      url: `/api/services/photos/${p.id}/view`,
    })),
  };
}

export function formatOpenOrderListItem(order: any) {
  return {
    ...formatOrder(order),
    address: formatAddressSummary(order.address),
  };
}

export function formatOrderWithProposals(order: any) {
  return {
    ...formatOrder(order),
    proposals: order.proposals.map((p: any) => ({
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

export function formatAgendaItem(order: any) {
  const payment = order.payments?.[0] ?? null;

  return {
    id: order.id,
    order_id: order.id,
    title: order.title,
    description: order.description,
    scheduled_at: order.scheduledAt,
    scheduled_end_at: order.scheduledEndAt ?? null,
    order_status: order.status,
    address: formatAddress(order.address),
    photos: formatPhotos(order.photos),
    payment: payment
      ? {
          status: payment.status,
          amount: payment.amount,
          paid_at: payment.paidAt,
        }
      : null,
  };
}

// --- Helpers for completion payload ---

/**
 * Builds the completion-order payload base (without proposals/photos) from an order and client user.
 */
export function buildCompletionOrderBase(
  order: any,
  client: { completeName?: string | null } | null,
) {
  const amount = toNumber(order.agreedPrice);
  return {
    ...formatOrder(order),
    order_id: order.id,
    client_name: client?.completeName ?? "Cliente",
    scheduled_at: order.scheduledAt ? order.scheduledAt.toISOString() : null,
    scheduled_end_at: order.scheduledEndAt
      ? order.scheduledEndAt.toISOString()
      : null,
    amount: amount ?? 0,
    order_status: order.status,
    photos: formatPhotos(order.photos),
  };
}

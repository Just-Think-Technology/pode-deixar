// Order tracking assembler — deep module for ContractTracking assembly

import { Injectable } from "@nestjs/common";
import { ServiceOrdersRepository } from "./service-orders.repository";
import { OrderPricing } from "./order-pricing.service";
import { formatAddress } from "./dto/service-order-address.dto";
import { toNumber } from "./mappers/service-order.mappers";

// --- Interface for test via interface ---

export interface OrderTrackingAssemblerPort {
  toContractTracking(order: any, viewerId: string, role: string): Promise<any>;
  assemble(order: any, viewerId: string, role: string): Promise<any>;
}

// --- Implementation ---

/**
 * Assembles the consolidated ContractTracking DTO from a hydrated order.
 * Keeps proposal/payment/review/evidence selection rules in one place
 * and delegates pricing math to OrderPricing.
 * Exposes the authoritative DB timeline (OrderTimelineEvent) so the
 * frontend renders backend timestamps instead of recomputing them.
 */
@Injectable()
export class OrderTrackingAssembler implements OrderTrackingAssemblerPort {
  constructor(
    private readonly repository: ServiceOrdersRepository,
    private readonly pricing: OrderPricing,
  ) {}

  async toContractTracking(
    order: any,
    _viewerId: string,
    role: string,
  ): Promise<any> {
    return this.assemble(order, _viewerId, role);
  }

  async assemble(order: any, _viewerId: string, role: string): Promise<any> {
    const { grossAmount, feeAmount, netAmount } =
      this.pricing.buildPricing(order);

    const counterpart = await this.buildCounterpart(order, role);

    const proposal = this.buildProposal(order);

    const payment = this.buildPayment(order);

    const review = this.buildReview(order);

    const evidence = this.buildEvidence(order, counterpart);

    const timeline = this.buildTimeline(order);

    const address =
      formatAddress(order.address) ??
      ({
        street: null,
        number: null,
        neighborhood: null,
        city: null,
        state: null,
        postal_code: null,
      } as any);

    const base: any = {
      orderId: order.id,
      title: order.title,
      description: order.description,
      categoryName: order.category?.name ?? null,
      orderStatus: order.status,
      role,
      counterpart,
      scheduledAt: order.scheduledAt
        ? new Date(order.scheduledAt).toISOString()
        : null,
      scheduledEndAt: order.scheduledEndAt
        ? new Date(order.scheduledEndAt).toISOString()
        : null,
      startedAt: order.startedAt
        ? new Date(order.startedAt).toISOString()
        : null,
      address,
      grossAmount,
      proposal,
      payment,
      evidence,
      review,
      timeline,
      cancelReason: order.cancelReason ?? null,
      cancelledAt: order.cancelledAt
        ? new Date(order.cancelledAt).toISOString()
        : null,
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : null,
    };

    // Fee redaction for CLIENT (AppSec): omit feeAmount/netAmount
    if (role === "CLIENT") {
      base.feeAmount = undefined;
      base.netAmount = undefined;
    } else {
      base.feeAmount = feeAmount;
      base.netAmount = netAmount;
    }

    return base;
  }

  // --- Private helpers ---

  private async buildCounterpart(order: any, role: string) {
    const counterpartId = role === "CLIENT" ? order.providerId : order.clientId;
    let counterpartUser: any = null;
    if (counterpartId) {
      counterpartUser = await this.repository.findUserById(counterpartId);
    }

    return {
      id: counterpartUser?.id ?? counterpartId ?? "",
      completeName:
        counterpartUser?.completeName ??
        (role === "CLIENT" ? "Prestador" : "Cliente"),
      avatarUrl:
        counterpartUser?.avatarUrl ??
        counterpartUser?.clientProfile?.avatarUrl ??
        counterpartUser?.providerProfile?.avatarUrl ??
        null,
    };
  }

  private buildProposal(order: any) {
    const accepted = order.proposals?.find((p: any) => p.status === "ACCEPTED");
    const reference = accepted ?? order.proposals?.[0] ?? null;
    if (!reference) {
      return null;
    }
    const isAccepted = reference.status === "ACCEPTED";
    return {
      id: reference.id,
      providerId: reference.providerId,
      price: toNumber(reference.price) ?? 0,
      description: reference.description,
      estimatedDuration: reference.estimatedDuration ?? null,
      acceptedAt: isAccepted
        ? reference.createdAt
          ? new Date(reference.createdAt).toISOString()
          : null
        : null,
    };
  }

  private buildPayment(order: any) {
    const paymentRecord = order.payments?.[0] ?? null;
    if (paymentRecord) {
      return {
        id: paymentRecord.id,
        status: paymentRecord.status,
        method: paymentRecord.method ?? null,
        amount: toNumber(paymentRecord.amount),
        paidAt: paymentRecord.paidAt
          ? new Date(paymentRecord.paidAt).toISOString()
          : null,
      };
    }
    return {
      id: null,
      status: "PENDING",
      method: null,
      amount: null,
      paidAt: null,
    };
  }

  private buildReview(order: any) {
    const reviewRecord = order.reviews?.[0] ?? null;
    if (!reviewRecord) {
      return null;
    }
    return {
      id: reviewRecord.id,
      rating: reviewRecord.rating,
      comment: reviewRecord.comment ?? null,
      createdAt: reviewRecord.createdAt
        ? new Date(reviewRecord.createdAt).toISOString()
        : new Date().toISOString(),
    };
  }

  private buildTimeline(order: any) {
    const events = order.timelineEvents;
    if (!Array.isArray(events)) {
      return [];
    }
    return events.map((event: any) => ({
      key: event.eventKey,
      occurredAt: event.createdAt
        ? new Date(event.createdAt).toISOString()
        : null,
      actorId: event.actorId ?? null,
    }));
  }

  private buildEvidence(order: any, counterpart: any) {
    if (order.status === "COMPLETED" && order.completedAt) {
      return {
        completedAt: new Date(order.completedAt).toISOString(),
        completedBy: order.completedBy ?? counterpart.completeName,
        observations: order.observations ?? null,
        photos: (order.photos ?? []).map((p: any) => ({
          id: p.id,
          url: `/api/services/photos/${p.id}/view`,
        })),
      };
    }
    return null;
  }
}

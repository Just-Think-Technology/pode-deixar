// Order pricing — platform fee calculations for tracking

import { Injectable } from "@nestjs/common";
import { toNumber } from "./mappers/service-order.mappers";

// --- Constants ---

const DEFAULT_FEE_RATE = 0.1;

// --- Interface (for test via interface) ---

export interface OrderPricingPort {
  toNumber(value: unknown): number | null;
  resolveGrossAmount(order: any): number | null;
  getPlatformFeeRate(): number;
  calculateFeeAmount(grossAmount: number | null): number | null;
  calculateNetAmount(
    grossAmount: number | null,
    feeAmount: number | null,
  ): number | null;
  buildPricing(order: any): {
    grossAmount: number | null;
    feeAmount: number | null;
    netAmount: number | null;
  };
}

// --- Implementation ---

/**
 * Deep module for pricing — encapsulates gross resolution and fee math.
 * Single home for platform fee rate handling and rounding.
 */
@Injectable()
export class OrderPricing implements OrderPricingPort {
  toNumber(value: unknown): number | null {
    return toNumber(value);
  }

  resolveGrossAmount(order: any): number | null {
    const rawGross =
      order.agreedPrice ??
      order.proposals?.find((p: any) => p.status === "ACCEPTED")?.price ??
      null;
    return this.toNumber(rawGross);
  }

  getPlatformFeeRate(): number {
    const raw = process.env.PLATFORM_FEE_RATE ?? String(DEFAULT_FEE_RATE);
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? DEFAULT_FEE_RATE : parsed;
  }

  calculateFeeAmount(grossAmount: number | null): number | null {
    if (grossAmount == null) {
      return null;
    }
    const feeRate = this.getPlatformFeeRate();
    return Math.round(grossAmount * feeRate * 100) / 100;
  }

  calculateNetAmount(
    grossAmount: number | null,
    feeAmount: number | null,
  ): number | null {
    if (grossAmount == null || feeAmount == null) {
      return null;
    }
    return Math.round((grossAmount - feeAmount) * 100) / 100;
  }

  buildPricing(order: any): {
    grossAmount: number | null;
    feeAmount: number | null;
    netAmount: number | null;
  } {
    const grossAmount = this.resolveGrossAmount(order);
    const feeAmount = this.calculateFeeAmount(grossAmount);
    const netAmount = this.calculateNetAmount(grossAmount, feeAmount);
    return { grossAmount, feeAmount, netAmount };
  }
}

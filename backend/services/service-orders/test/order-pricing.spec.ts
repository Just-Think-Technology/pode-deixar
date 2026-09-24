// OrderPricing tests — deep module interface coverage

import { Test, TestingModule } from "@nestjs/testing";
import { OrderPricing } from "../src/service-orders/order-pricing.service";

describe("OrderPricing", () => {
  let pricing: OrderPricing;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderPricing],
    }).compile();
    pricing = module.get<OrderPricing>(OrderPricing);
  });

  afterEach(() => {
    delete process.env.PLATFORM_FEE_RATE;
  });

  describe("toNumber", () => {
    it("delegates to mapper", () => {
      expect(pricing.toNumber(10)).toBe(10);
      expect(pricing.toNumber(null)).toBeNull();
      expect(pricing.toNumber({ toNumber: () => 5.5 } as any)).toBe(5.5);
    });
  });

  describe("resolveGrossAmount", () => {
    it("prefers agreedPrice", () => {
      const order = { agreedPrice: 200, proposals: [{ price: 100, status: "ACCEPTED" }] };
      expect(pricing.resolveGrossAmount(order)).toBe(200);
    });

    it("falls back to accepted proposal price", () => {
      const order = { agreedPrice: null, proposals: [{ price: 150, status: "ACCEPTED" }] };
      expect(pricing.resolveGrossAmount(order)).toBe(150);
    });

    it("returns null when no price", () => {
      const order = { agreedPrice: null, proposals: [] };
      expect(pricing.resolveGrossAmount(order)).toBeNull();
    });

    it("handles Decimal via toNumber", () => {
      const order = { agreedPrice: { toNumber: () => 99.99 }, proposals: [] };
      expect(pricing.resolveGrossAmount(order)).toBe(99.99);
    });
  });

  describe("getPlatformFeeRate", () => {
    it("defaults to 0.10", () => {
      delete process.env.PLATFORM_FEE_RATE;
      expect(pricing.getPlatformFeeRate()).toBe(0.1);
    });

    it("reads from env", () => {
      process.env.PLATFORM_FEE_RATE = "0.15";
      expect(pricing.getPlatformFeeRate()).toBe(0.15);
    });

    it("falls back when NaN", () => {
      process.env.PLATFORM_FEE_RATE = "not-a-number";
      expect(pricing.getPlatformFeeRate()).toBe(0.1);
    });
  });

  describe("calculateFeeAmount", () => {
    it("calculates rounded fee", () => {
      process.env.PLATFORM_FEE_RATE = "0.10";
      expect(pricing.calculateFeeAmount(180)).toBe(18);
      expect(pricing.calculateFeeAmount(100)).toBe(10);
      // 99.99 * 0.10 = 9.999 -> 10.00
      expect(pricing.calculateFeeAmount(99.99)).toBe(10);
    });

    it("returns null for null gross", () => {
      expect(pricing.calculateFeeAmount(null)).toBeNull();
    });
  });

  describe("calculateNetAmount", () => {
    it("calculates net", () => {
      expect(pricing.calculateNetAmount(180, 18)).toBe(162);
      expect(pricing.calculateNetAmount(100, 10)).toBe(90);
    });

    it("returns null when inputs null", () => {
      expect(pricing.calculateNetAmount(null, 10)).toBeNull();
      expect(pricing.calculateNetAmount(100, null)).toBeNull();
    });
  });

  describe("buildPricing", () => {
    it("builds gross/fee/net together", () => {
      process.env.PLATFORM_FEE_RATE = "0.10";
      const order = { agreedPrice: 200, proposals: [] };
      const result = pricing.buildPricing(order);
      expect(result.grossAmount).toBe(200);
      expect(result.feeAmount).toBe(20);
      expect(result.netAmount).toBe(180);
    });

    it("caps at null when no gross", () => {
      const order = { agreedPrice: null, proposals: [] };
      const result = pricing.buildPricing(order);
      expect(result.grossAmount).toBeNull();
      expect(result.feeAmount).toBeNull();
      expect(result.netAmount).toBeNull();
    });
  });
});

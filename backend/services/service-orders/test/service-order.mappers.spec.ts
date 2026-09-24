// Service order mappers tests — pure mapper coverage

import {
  toNumber,
  formatOrder,
  formatPhotos,
  formatCompletionHistory,
  formatOpenOrderListItem,
  formatOrderWithProposals,
  formatAgendaItem,
  buildCompletionOrderBase,
} from "../src/service-orders/mappers/service-order.mappers";

describe("service-order.mappers", () => {
  describe("toNumber", () => {
    it("returns null for null/undefined", () => {
      expect(toNumber(null)).toBeNull();
      expect(toNumber(undefined)).toBeNull();
    });

    it("passes through number", () => {
      expect(toNumber(42)).toBe(42);
    });

    it("converts Prisma Decimal via toNumber", () => {
      const decimal = { toNumber: () => 123.45 };
      expect(toNumber(decimal)).toBe(123.45);
    });

    it("converts string numeric", () => {
      expect(toNumber("10.5")).toBe(10.5);
      expect(toNumber("not-a-number")).toBeNull();
    });
  });

  describe("formatOrder", () => {
    it("maps order fields and category", () => {
      const order = {
        id: "order-1",
        clientId: "client-1",
        providerId: "provider-1",
        providerServiceId: "ps-1",
        agreedPrice: 100,
        title: "Title",
        description: "Desc",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "Cat", slug: "cat" },
        budgetMin: 10,
        budgetMax: 20,
        address: { city: "SP", state: "SP" },
        status: "OPEN",
        scheduledAt: new Date("2026-01-01T00:00:00Z"),
        scheduledEndAt: null,
        completedAt: null,
        completedBy: null,
        observations: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };
      const result: any = formatOrder(order);
      expect(result.id).toBe("order-1");
      expect(result.client_id).toBe("client-1");
      expect(result.provider_id).toBe("provider-1");
      expect(result.category.name).toBe("Cat");
      expect(result.address.city).toBe("SP");
    });

    it("handles null address and category", () => {
      const order = {
        id: "o",
        clientId: "c",
        providerId: null,
        providerServiceId: null,
        agreedPrice: null,
        title: "t",
        description: "d",
        categoryId: "cat",
        category: null,
        budgetMin: null,
        budgetMax: null,
        address: null,
        status: "OPEN",
        scheduledAt: null,
        scheduledEndAt: null,
        completedAt: null,
        completedBy: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result: any = formatOrder(order);
      expect(result.category).toBeNull();
      expect(result.address).toBeNull();
    });
  });

  describe("formatPhotos", () => {
    it("maps photos to view url", () => {
      const photos = [{ id: "p1", createdAt: new Date("2026-01-01") }];
      const result = formatPhotos(photos as any);
      expect(result[0].url).toBe("/api/services/photos/p1/view");
      expect(result[0].id).toBe("p1");
    });

    it("returns empty for undefined", () => {
      expect(formatPhotos(undefined)).toEqual([]);
    });
  });

  describe("formatCompletionHistory", () => {
    it("maps completion history", () => {
      const order = {
        id: "order-1",
        completedAt: new Date("2026-09-16T10:00:00Z"),
        completedBy: "provider-1",
        observations: "done",
      };
      const photos = [{ id: "ph1", url: "http://minio/a.webp" }];
      const result: any = formatCompletionHistory(order, photos as any);
      expect(result.order_id).toBe("order-1");
      expect(result.completed_by).toBe("provider-1");
      expect(result.photos[0].url).toBe("/api/services/photos/ph1/view");
      expect(result.completed_at).toBe("2026-09-16T10:00:00.000Z");
    });
  });

  describe("formatOpenOrderListItem", () => {
    it("returns summarized address", () => {
      const order = {
        id: "o1",
        clientId: "c1",
        providerId: null,
        providerServiceId: null,
        agreedPrice: null,
        title: "t",
        description: "d",
        categoryId: "cat",
        category: null,
        budgetMin: null,
        budgetMax: null,
        address: {
          street: "Rua Augusta",
          number: "500",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          postalCode: "01000-000",
        },
        status: "OPEN",
        scheduledAt: null,
        scheduledEndAt: null,
        completedAt: null,
        completedBy: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result: any = formatOpenOrderListItem(order);
      expect(result.address).toEqual({ city: "São Paulo", state: "SP" });
    });
  });

  describe("formatOrderWithProposals", () => {
    it("maps proposals", () => {
      const order = {
        id: "o1",
        clientId: "c1",
        providerId: null,
        providerServiceId: null,
        agreedPrice: null,
        title: "t",
        description: "d",
        categoryId: "cat",
        category: null,
        budgetMin: null,
        budgetMax: null,
        address: null,
        status: "OPEN",
        scheduledAt: null,
        scheduledEndAt: null,
        completedAt: null,
        completedBy: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        proposals: [
          {
            id: "prop-1",
            providerId: "prov-1",
            price: 100,
            description: "desc",
            estimatedDuration: "2h",
            status: "PENDING",
            createdAt: new Date(),
          },
        ],
      };
      const result: any = formatOrderWithProposals(order);
      expect(result.proposals).toHaveLength(1);
      expect(result.proposals[0].provider_id).toBe("prov-1");
    });
  });

  describe("formatAgendaItem", () => {
    it("maps agenda item with payment and photos", () => {
      const order: any = {
        id: "order-1",
        title: "Trocar chuveiro",
        description: "desc",
        scheduledAt: new Date("2026-08-20T14:00:00Z"),
        scheduledEndAt: new Date("2026-08-20T17:00:00Z"),
        status: "IN_PROGRESS",
        address: { city: "SP", state: "SP" },
        photos: [{ id: "p1", url: "http://minio/p1.webp" }],
        payments: [{ status: "PAID", amount: 150, paidAt: new Date() }],
      };
      const result: any = formatAgendaItem(order);
      expect(result.order_id).toBe("order-1");
      expect(result.payment.status).toBe("PAID");
      expect(result.photos[0].url).toBe("/api/services/photos/p1/view");
    });

    it("handles null payment", () => {
      const order: any = {
        id: "o1",
        title: "t",
        description: "d",
        scheduledAt: new Date(),
        scheduledEndAt: null,
        status: "IN_PROGRESS",
        address: null,
        photos: [],
        payments: [],
      };
      const result: any = formatAgendaItem(order);
      expect(result.payment).toBeNull();
    });
  });

  describe("buildCompletionOrderBase", () => {
    it("builds base with client name and amount", () => {
      const order: any = {
        id: "order-1",
        clientId: "client-1",
        providerId: null,
        providerServiceId: null,
        agreedPrice: 200,
        title: "t",
        description: "d",
        categoryId: "cat",
        category: null,
        budgetMin: null,
        budgetMax: null,
        address: null,
        status: "IN_PROGRESS",
        scheduledAt: new Date("2026-09-20T10:00:00Z"),
        scheduledEndAt: null,
        completedAt: null,
        completedBy: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        photos: [],
      };
      const client = { completeName: "Ana Costa" };
      const result: any = buildCompletionOrderBase(order, client);
      expect(result.client_name).toBe("Ana Costa");
      expect(result.amount).toBe(200);
      expect(result.order_id).toBe("order-1");
    });

    it("defaults client name and amount when missing", () => {
      const order: any = {
        id: "o1",
        clientId: "c1",
        providerId: null,
        providerServiceId: null,
        agreedPrice: null,
        title: "t",
        description: "d",
        categoryId: "cat",
        category: null,
        budgetMin: null,
        budgetMax: null,
        address: null,
        status: "OPEN",
        scheduledAt: null,
        scheduledEndAt: null,
        completedAt: null,
        completedBy: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        photos: [],
      };
      const result: any = buildCompletionOrderBase(order, null);
      expect(result.client_name).toBe("Cliente");
      expect(result.amount).toBe(0);
    });
  });
});

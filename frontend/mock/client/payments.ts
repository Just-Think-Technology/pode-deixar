import { getMockClientOrderById } from "@/mock/client/orders";
import type {
  ChargeResponse,
  CreatePaymentPayload,
  Payment,
  PaymentStatusResponse,
} from "@/lib/client/payments/types";

/** PNG 1x1 transparente em base64 (QR mock opcional). */
const MOCK_QR_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type StoredPayment = Payment & {
  charged: boolean;
  chargeRef: string | null;
  cobranca: ChargeResponse["cobranca"] | null;
};

type MockPaymentsGlobal = typeof globalThis & {
  __podeDeixarMockPayments?: Map<string, StoredPayment>;
};

function getStore(): Map<string, StoredPayment> {
  const g = globalThis as MockPaymentsGlobal;
  if (!g.__podeDeixarMockPayments) {
    g.__podeDeixarMockPayments = new Map();
  }
  return g.__podeDeixarMockPayments;
}

export function resetMockPayments() {
  const g = globalThis as MockPaymentsGlobal;
  g.__podeDeixarMockPayments = new Map();
}

function resolveAmount(serviceOrderId: string): number {
  const order = getMockClientOrderById(serviceOrderId);
  if (!order) {
    throw new Error("Pedido não encontrado");
  }
  if (order.status === "CANCELLED") {
    throw new Error("Não é possível pagar um pedido cancelado");
  }

  const accepted = order.proposals?.find((p) => p.status === "ACCEPTED");
  if (accepted) {
    return accepted.price;
  }

  throw new Error(
    "Pedido sem preço definido. Aceite uma proposta antes de pagar.",
  );
}

function toPublicPayment(stored: StoredPayment): Payment {
  const {
    id,
    serviceOrderId,
    amount,
    currency,
    method,
    status,
    externalRef,
    paidAt,
    createdAt,
    updatedAt,
  } = stored;
  return {
    id,
    serviceOrderId,
    amount,
    currency,
    method,
    status,
    externalRef,
    paidAt,
    createdAt,
    updatedAt,
  };
}

export function mockCreatePayment(payload: CreatePaymentPayload): Payment {
  const amount = resolveAmount(payload.serviceOrderId);
  const now = new Date().toISOString();
  const id = `mock-payment-${crypto.randomUUID()}`;

  const stored: StoredPayment = {
    id,
    serviceOrderId: payload.serviceOrderId,
    amount,
    currency: "BRL",
    method: payload.method,
    status: "PENDING",
    externalRef: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
    charged: false,
    chargeRef: null,
    cobranca: null,
  };

  getStore().set(id, stored);
  return toPublicPayment(stored);
}

export function mockChargePayment(paymentId: string): ChargeResponse {
  const stored = getStore().get(paymentId);
  if (!stored) {
    throw new Error("Pagamento não encontrado");
  }
  if (stored.status !== "PENDING") {
    throw new Error("Pagamento não está pendente");
  }
  if (stored.charged && stored.chargeRef && stored.cobranca) {
    return {
      paymentId: stored.id,
      chargeRef: stored.chargeRef,
      status: stored.status,
      cobranca: stored.cobranca,
    };
  }

  const chargeRef = `chg_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  let cobranca: ChargeResponse["cobranca"];

  if (stored.method === "PIX") {
    cobranca = {
      pixCopiaECola: `00020126580014br.gov.bcb.pix0136${chargeRef}520400005303986540${stored.amount.toFixed(2)}5802BR5925Pode Deixar Mock6009SAO PAULO62070503***6304ABCD`,
      qrCodeBase64: MOCK_QR_BASE64,
    };
  } else {
    cobranca = {
      linkCheckout: `https://checkout.mock.pode-deixar.com/${chargeRef}`,
    };
  }

  stored.charged = true;
  stored.chargeRef = chargeRef;
  stored.cobranca = cobranca;
  stored.externalRef = chargeRef;
  stored.updatedAt = new Date().toISOString();

  return {
    paymentId: stored.id,
    chargeRef,
    status: "PENDING",
    cobranca,
  };
}

export function mockGetPaymentStatus(
  paymentId: string,
): PaymentStatusResponse {
  const stored = getStore().get(paymentId);
  if (!stored) {
    throw new Error("Pagamento não encontrado");
  }

  return {
    paymentId: stored.id,
    serviceOrderId: stored.serviceOrderId,
    status: stored.status,
    method: stored.method,
    amount: stored.amount,
    currency: stored.currency,
    externalRef: stored.externalRef,
    paidAt: stored.paidAt,
    createdAt: stored.createdAt,
  };
}

export function mockGetPaymentById(paymentId: string): Payment | null {
  const stored = getStore().get(paymentId);
  return stored ? toPublicPayment(stored) : null;
}

export function mockFindPendingPaymentByOrder(
  serviceOrderId: string,
): Payment | null {
  for (const stored of getStore().values()) {
    if (
      stored.serviceOrderId === serviceOrderId &&
      stored.status === "PENDING"
    ) {
      return toPublicPayment(stored);
    }
  }
  return null;
}

/** Simula confirmação do webhook mock (PENDING → PAID). */
export function mockConfirmPayment(paymentId: string): PaymentStatusResponse {
  const stored = getStore().get(paymentId);
  if (!stored) {
    throw new Error("Pagamento não encontrado");
  }
  if (stored.status === "PAID") {
    return mockGetPaymentStatus(paymentId);
  }
  if (stored.status !== "PENDING") {
    throw new Error("Só é possível confirmar pagamento pendente");
  }
  if (!stored.charged) {
    throw new Error("Gere a cobrança antes de confirmar o pagamento");
  }

  const now = new Date().toISOString();
  stored.status = "PAID";
  stored.paidAt = now;
  stored.updatedAt = now;

  return mockGetPaymentStatus(paymentId);
}

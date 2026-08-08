import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PaymentMethod } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MercadoPagoService } from "../mercadopago/mercadopago.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";
import { MercadoPagoWebhookDto } from "./dto/mercadopago-webhook.dto";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoService,
  ) {}

  findAll() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        amount: dto.amount,
        method: dto.method,
        status: "PENDING",
      },
    });
  }

  async generateCharge(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento ${paymentId} não encontrado`);
    }

    if (payment.status !== "PENDING") {
      throw new BadRequestException(
        "Cobrança só pode ser gerada para pagamento pendente",
      );
    }

    if (this.mercadoPago.isConfigured && payment.method === PaymentMethod.PIX) {
      return this.gerarCobrancaMercadoPago(payment);
    }

    return this.gerarCobrancaMock(payment);
  }

  async getStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento ${paymentId} não encontrado`);
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      externalRef: payment.externalRef,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  async confirmPayment(dto: PaymentWebhookDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Pagamento ${dto.paymentId} não encontrado`);
    }

    if (payment.status === "PAID") {
      return payment;
    }

    return this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        externalRef: dto.externalId,
      },
    });
  }

  async handleMercadoPagoWebhook(dto: MercadoPagoWebhookDto) {
    const mpPayment = await this.mercadoPago.getPayment(dto.data.id);

    const payment = await this.prisma.payment.findUnique({
      where: { id: mpPayment.externalReference || "" },
    });

    if (!payment) {
      throw new NotFoundException(
        `Pagamento ${mpPayment.externalReference} não encontrado`,
      );
    }

    if (payment.status === "PAID") {
      return payment;
    }

    const status = this.traduzirStatusMercadoPago(mpPayment.status);

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
        externalRef: String(mpPayment.id),
      },
    });
  }

  private async gerarCobrancaMercadoPago(payment: {
    id: string;
    amount: unknown;
    method: PaymentMethod;
  }) {
    const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;

    const charge = await this.mercadoPago.createPixCharge({
      amount: Number(payment.amount),
      externalReference: payment.id,
      payerEmail:
        process.env.MERCADO_PAGO_PAYER_EMAIL || "sandbox@pode-deixar.com",
      notificationUrl,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalRef: String(charge.id) },
    });

    return {
      paymentId: payment.id,
      chargeRef: String(charge.id),
      status: "PENDING",
      cobranca: {
        pixCopiaECola: charge.qrCode,
        qrCodeBase64: charge.qrCodeBase64,
        mercadoPagoId: charge.id,
      },
    };
  }

  private gerarCobrancaMock(payment: {
    id: string;
    amount: unknown;
    method: string;
  }) {
    const chargeRef = `chg_mock_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

    return {
      paymentId: payment.id,
      chargeRef,
      status: "PENDING",
      cobranca: this.gerarCobrancaMockDetail(payment.method, chargeRef),
    };
  }

  private gerarCobrancaMockDetail(method: string, chargeRef: string) {
    if (method === PaymentMethod.PIX) {
      return {
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136${chargeRef}5204000053039865406150.005802BR5913PODE-DEIXAR6009SAO PAULO`,
      };
    }

    return {
      linkCheckout: `https://checkout.mock.pode-deixar.com/${chargeRef}`,
    };
  }

  private traduzirStatusMercadoPago(mpStatus: string): PaymentStatus {
    const mapa: Record<string, PaymentStatus> = {
      approved: "PAID",
      pending: "PENDING",
      in_process: "PENDING",
      rejected: "FAILED",
      cancelled: "CANCELLED",
      refunded: "REFUNDED",
    };

    return mapa[mpStatus] || "PENDING";
  }
}

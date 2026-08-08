import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PaymentMethod } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentWebhookDto } from "./dto/payment-webhook.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const chargeRef = `chg_mock_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { externalRef: chargeRef },
    });

    return {
      paymentId: payment.id,
      chargeRef,
      status: "PENDING",
      cobranca: this.gerarCobrancaMock(payment.method, chargeRef),
    };
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

  private gerarCobrancaMock(method: PaymentMethod, chargeRef: string) {
    if (method === PaymentMethod.PIX) {
      return {
        pixCopiaECola: `00020126580014br.gov.bcb.pix0136${chargeRef}5204000053039865406150.005802BR5913PODE-DEIXAR6009SAO PAULO`,
      };
    }

    return {
      linkCheckout: `https://checkout.mock.pode-deixar.com/${chargeRef}`,
    };
  }
}

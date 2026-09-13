// Payment DTO — charge creation input validation

import {
  IsEnum,
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod } from "@prisma/client";

export const SUPPORTED_CURRENCIES = ["BRL"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export class CreatePaymentDto {
  @ApiProperty({
    description: "Service order ID",
    example: "uuid-do-pedido",
  })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({
    description: "Payment method",
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description:
      "Scheduled date/time for the service (ISO 8601). Required: scheduling is set by the client at checkout and takes effect when the payment is confirmed.",
    example: "2026-08-20T14:00:00.000Z",
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description:
      "Expected service end date/time (ISO 8601). Must be after scheduledAt.",
    example: "2026-08-20T17:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({
    description: "Payment currency (default: BRL)",
    enum: SUPPORTED_CURRENCIES,
    default: "BRL",
    example: "BRL",
  })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: SupportedCurrency;

  @ApiPropertyOptional({
    description:
      "Idempotency key — same key for the same order returns the existing payment (prevents duplication)",
    example: "uuid-unico-do-cliente",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

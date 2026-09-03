import {
  IsEnum,
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod } from "@prisma/client";

export const MOEDAS_SUPORTADAS = ["BRL"] as const;
export type MoedaSuportada = (typeof MOEDAS_SUPORTADAS)[number];

export class CreatePaymentDto {
  @ApiProperty({
    description: "ID do pedido de serviço",
    example: "uuid-do-pedido",
  })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({
    description: "Método de pagamento",
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description:
      "Data/hora agendada para a realização do serviço (ISO 8601). Obrigatória: o agendamento é definido pelo cliente no checkout e passa a valer quando o pagamento é confirmado.",
    example: "2026-08-20T14:00:00.000Z",
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description:
      "Data/hora prevista de término do serviço (ISO 8601). Deve ser posterior a scheduledAt.",
    example: "2026-08-20T17:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({
    description: "Moeda do pagamento (padrão: BRL)",
    enum: MOEDAS_SUPORTADAS,
    default: "BRL",
    example: "BRL",
  })
  @IsOptional()
  @IsIn(MOEDAS_SUPORTADAS)
  currency?: MoedaSuportada;

  @ApiPropertyOptional({
    description:
      "Chave de idempotência — mesma chave para o mesmo pedido retorna o pagamento existente (evita duplicação)",
    example: "uuid-unico-do-cliente",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

import {
  IsEnum,
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
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
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey?: string;
}

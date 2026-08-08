import {
  IsString,
  IsNumber,
  IsEnum,
  IsPositive,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
  @ApiProperty({
    description: "ID do pedido de serviço",
    example: "uuid-do-pedido",
  })
  @IsString()
  @MaxLength(36)
  serviceOrderId: string;

  @ApiProperty({
    description: "Valor do pagamento",
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: "Método de pagamento",
    enum: PaymentMethod,
    example: PaymentMethod.PIX,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

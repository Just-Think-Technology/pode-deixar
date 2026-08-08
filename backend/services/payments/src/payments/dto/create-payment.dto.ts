import { IsEnum, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PaymentMethod } from "@prisma/client";

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
}

import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsPositive,
  IsUUID,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PaymentWebhookDto {
  @ApiProperty({
    description: "ID do pagamento no sistema (Pode Deixar)",
    example: "uuid-do-pagamento",
  })
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: "ID da transação no gateway de pagamento (mock)",
    example: "tx_mock_1234567890",
  })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({
    description: "Valor confirmado pelo gateway (mock)",
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}

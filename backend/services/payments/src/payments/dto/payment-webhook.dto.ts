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
    description: "Payment ID in the system (Pode Deixar)",
    example: "uuid-do-pagamento",
  })
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: "Unique event ID (used for idempotency/anti-replay)",
    example: "evt_mock_abcdef",
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: "Transaction ID at the payment gateway (mock)",
    example: "tx_mock_1234567890",
  })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({
    description: "Amount confirmed by the gateway (mock)",
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: "Event timestamp (Unix seconds) for anti-replay",
    example: "1710000000",
  })
  @IsString()
  @IsNotEmpty()
  timestamp: string;
}

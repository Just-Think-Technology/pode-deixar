import { IsString, IsNotEmpty, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class MercadoPagoWebhookDataDto {
  @ApiProperty({
    description: "ID do pagamento no Mercado Pago",
    example: "123456789",
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class MercadoPagoWebhookDto {
  @ApiProperty({
    description: "Tipo do evento (payment)",
    example: "payment",
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: "Dados do pagamento",
    type: MercadoPagoWebhookDataDto,
  })
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data: MercadoPagoWebhookDataDto;

  @ApiProperty({
    description: "Ação do evento (payment.created, payment.updated)",
    example: "payment.updated",
  })
  @IsString()
  action: string;
}

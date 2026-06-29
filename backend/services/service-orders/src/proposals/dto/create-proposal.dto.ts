import {
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
  IsPositive,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateProposalDto {
  @ApiProperty({
    description: "ID do pedido de serviço",
    example: "uuid-do-pedido",
  })
  @IsString()
  serviceOrderId: string;

  @ApiProperty({
    description: "Preço proposto",
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({
    description: "Descrição da proposta",
    example:
      "Posso realizar o serviço ainda esta semana, com garantia de 90 dias",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: "Duração estimada do serviço",
    example: "2 horas",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  estimatedDuration?: string;
}

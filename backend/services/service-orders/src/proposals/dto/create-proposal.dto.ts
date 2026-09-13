// Proposal DTO — provider proposal input validation

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
    description: "Service order ID",
    example: "uuid-do-pedido",
  })
  @IsString()
  serviceOrderId: string;

  @ApiProperty({
    description: "Proposed price",
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({
    description: "Description da proposta",
    example:
      "Posso realizar o serviço ainda esta semana, com garantia de 90 dias",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: "Estimated service duration",
    example: "2 horas",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  estimatedDuration?: string;
}

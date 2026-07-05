import {
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
  IsPositive,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCounterProposalDto {
  @ApiProperty({
    description: "ID da proposta original",
    example: "uuid-da-proposta",
  })
  @IsString()
  proposalId: string;

  @ApiProperty({
    description: "Valor contraproposto",
    example: 180.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({
    description: "Descrição da contraproposta",
    example: "Posso fazer por este valor, mas com prazo maior",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: "Prazo estimado",
    example: "3 dias",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  estimatedDuration?: string;
}

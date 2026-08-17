import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateReviewDto {
  @ApiProperty({ description: "ID do pedido de serviço concluído" })
  @IsUUID()
  @IsNotEmpty({ message: "Pedido de serviço é obrigatório" })
  serviceOrderId: string;

  @ApiProperty({ description: "Nota de 1 a 5", minimum: 1, maximum: 5 })
  @IsInt({ message: "Nota deve ser um número inteiro" })
  @Min(1, { message: "Nota mínima é 1" })
  @Max(5, { message: "Nota máxima é 5" })
  rating: number;

  @ApiPropertyOptional({
    description: "Comentário da avaliação",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "Comentário deve ser um texto" })
  @MaxLength(500, { message: "Comentário muito longo" })
  comment?: string;
}

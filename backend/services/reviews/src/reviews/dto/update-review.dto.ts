import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateReviewDto {
  @ApiPropertyOptional({ description: "Nota de 1 a 5", minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt({ message: "Nota deve ser um número inteiro" })
  @Min(1, { message: "Nota mínima é 1" })
  @Max(5, { message: "Nota máxima é 5" })
  rating?: number;

  @ApiPropertyOptional({
    description: "Comentário da avaliação",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "Comentário deve ser um texto" })
  @MaxLength(500, { message: "Comentário muito longo" })
  comment?: string;
}

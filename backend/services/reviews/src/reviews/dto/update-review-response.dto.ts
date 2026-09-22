// Review response DTO — update response validation

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateReviewResponseDto {
  @ApiProperty({ description: "Response message", maxLength: 500 })
  @IsString({ message: "Mensagem deve ser um texto" })
  @IsNotEmpty({ message: "Mensagem é obrigatória" })
  @MaxLength(500, { message: "Mensagem deve ter no máximo 500 caracteres" })
  message: string;
}

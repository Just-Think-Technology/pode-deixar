// Complete service order DTO — provider marks service as completed

import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CompleteServiceOrderDto {
  @ApiPropertyOptional({
    description: "Optional observations about the completed service",
    example: "Serviço realizado com sucesso, cliente orientado",
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: "Observações devem ser um texto" })
  @MaxLength(2000, {
    message: "Observações devem ter no máximo 2000 caracteres",
  })
  observations?: string | null;
}

// Cancel service order DTO — reason for cancellation from any non-final status

import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CancelServiceOrderDto {
  @ApiPropertyOptional({
    description: "Reason for cancellation",
    example: "Cliente solicitou o cancelamento",
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: "Motivo deve ser um texto" })
  @MaxLength(500, { message: "Motivo deve ter no máximo 500 caracteres" })
  cancelReason?: string | null;

  @ApiPropertyOptional({
    description: "Alternative field name for reason (legacy)",
    example: "Cliente solicitou",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Motivo deve ter no máximo 500 caracteres" })
  reason?: string | null;
}

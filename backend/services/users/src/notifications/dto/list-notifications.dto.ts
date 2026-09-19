// List notifications DTO — query filters for GET /notifications

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBooleanString, IsEnum, IsOptional } from "class-validator";
import { NotificationType } from "@prisma/client";

// --- DTO ---

export class ListNotificationsDto {
  @ApiPropertyOptional({
    description: "Filter by notification type",
    enum: NotificationType,
    example: NotificationType.SERVICE,
  })
  @IsOptional()
  @IsEnum(NotificationType, { message: "Tipo de notificação inválido" })
  type?: NotificationType;

  @ApiPropertyOptional({
    description: "Filter by read state",
    example: "false",
  })
  @IsOptional()
  @IsBooleanString({
    message: "Filtro de leitura deve ser verdadeiro ou falso",
  })
  isRead?: string;
}

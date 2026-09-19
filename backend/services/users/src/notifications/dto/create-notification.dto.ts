// Create notification DTO — internal notification creation validation

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { NotificationType } from "@prisma/client";

// --- DTO ---

/**
 * Internal DTO for creating a notification via NotificationsService.notify.
 * Used by service layer, not directly exposed as a public endpoint.
 */
export class CreateNotificationDto {
  @ApiProperty({ description: "Target user id", format: "uuid" })
  @IsUUID("4", { message: "ID do usuário deve ser um UUID válido" })
  userId: string;

  @ApiProperty({ description: "Notification type", enum: NotificationType })
  @IsEnum(NotificationType, { message: "Tipo de notificação inválido" })
  type: NotificationType;

  @ApiProperty({ description: "Notification title", maxLength: 200 })
  @IsString({ message: "Título deve ser uma string" })
  @MaxLength(200, { message: "Título deve ter no máximo 200 caracteres" })
  title: string;

  @ApiProperty({ description: "Notification message", maxLength: 500 })
  @IsString({ message: "Mensagem deve ser uma string" })
  @MaxLength(500, { message: "Mensagem deve ter no máximo 500 caracteres" })
  message: string;

  @ApiPropertyOptional({ description: "Conversation id", format: "uuid" })
  @IsOptional()
  @IsUUID("4", { message: "ID da conversa deve ser um UUID válido" })
  conversationId?: string | null;

  @ApiPropertyOptional({
    description: "Contract / service order id",
    format: "uuid",
  })
  @IsOptional()
  @IsUUID("4", { message: "ID do contrato deve ser um UUID válido" })
  contractId?: string | null;
}

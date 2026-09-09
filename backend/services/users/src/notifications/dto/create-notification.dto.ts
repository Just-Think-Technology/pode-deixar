import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const NOTIFICATION_TYPES = [
  "BUDGET",
  "PROPOSAL_ACCEPTED",
  "SERVICE_COMPLETED",
  "NEW_MESSAGE",
] as const;

const RELATED_TYPES = ["ORDER", "PROPOSAL", "REVIEW"] as const;

export class CreateNotificationDto {
  @ApiPropertyOptional({
    description:
      "Recipient (ignored by the server: the notification is always created for the authenticated user)",
    example: "uuid-do-usuario",
  })
  @IsOptional()
  @IsUUID("4", { message: "Destinatário deve ser um UUID válido" })
  recipient?: string;

  @ApiProperty({
    description: "Notification type",
    enum: NOTIFICATION_TYPES,
  })
  @IsIn([...NOTIFICATION_TYPES], { message: "Tipo de notificação inválido" })
  type: "BUDGET" | "PROPOSAL_ACCEPTED" | "SERVICE_COMPLETED" | "NEW_MESSAGE";

  @ApiProperty({ description: "Notification title", maxLength: 200 })
  @IsString({ message: "Título deve ser uma string" })
  @MaxLength(200, { message: "Título deve ter no máximo 200 caracteres" })
  title: string;

  @ApiProperty({ description: "Notification message", maxLength: 200 })
  @IsString({ message: "Mensagem deve ser uma string" })
  @MaxLength(200, { message: "Mensagem deve ter no máximo 200 caracteres" })
  message: string;

  @ApiPropertyOptional({ description: "Related resource ID" })
  @IsOptional()
  @IsUUID("4", { message: "ID relacionado deve ser um UUID válido" })
  relatedId?: string;

  @ApiPropertyOptional({
    description: "Related resource type",
    enum: RELATED_TYPES,
  })
  @IsOptional()
  @IsIn([...RELATED_TYPES], { message: "Tipo relacionado inválido" })
  relatedType?: "ORDER" | "PROPOSAL" | "REVIEW";
}

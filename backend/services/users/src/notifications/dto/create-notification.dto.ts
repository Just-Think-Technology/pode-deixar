import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const TIPOS_NOTIFICACAO = [
  "BUDGET",
  "PROPOSAL_ACCEPTED",
  "SERVICE_COMPLETED",
  "NEW_MESSAGE",
] as const;

const TIPOS_RELACIONADOS = ["ORDER", "PROPOSAL", "REVIEW"] as const;

export class CreateNotificationDto {
  @ApiPropertyOptional({
    description:
      "Destinatário (ignorado pelo servidor: a notificação é sempre criada para o próprio usuário autenticado)",
    example: "uuid-do-usuario",
  })
  @IsOptional()
  @IsUUID("4", { message: "Destinatário deve ser um UUID válido" })
  recipient?: string;

  @ApiProperty({
    description: "Tipo da notificação",
    enum: TIPOS_NOTIFICACAO,
  })
  @IsIn([...TIPOS_NOTIFICACAO], { message: "Tipo de notificação inválido" })
  type: "BUDGET" | "PROPOSAL_ACCEPTED" | "SERVICE_COMPLETED" | "NEW_MESSAGE";

  @ApiProperty({ description: "Título da notificação", maxLength: 200 })
  @IsString({ message: "Título deve ser uma string" })
  @MaxLength(200, { message: "Título deve ter no máximo 200 caracteres" })
  title: string;

  @ApiProperty({ description: "Mensagem da notificação", maxLength: 200 })
  @IsString({ message: "Mensagem deve ser uma string" })
  @MaxLength(200, { message: "Mensagem deve ter no máximo 200 caracteres" })
  message: string;

  @ApiPropertyOptional({ description: "ID do recurso relacionado" })
  @IsOptional()
  @IsUUID("4", { message: "ID relacionado deve ser um UUID válido" })
  relatedId?: string;

  @ApiPropertyOptional({
    description: "Tipo do recurso relacionado",
    enum: TIPOS_RELACIONADOS,
  })
  @IsOptional()
  @IsIn([...TIPOS_RELACIONADOS], { message: "Tipo relacionado inválido" })
  relatedType?: "ORDER" | "PROPOSAL" | "REVIEW";
}

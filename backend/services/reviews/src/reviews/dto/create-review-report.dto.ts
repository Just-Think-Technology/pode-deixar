// Review report DTO — report creation validation

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum ReportReasonDto {
  OFENSA = "OFENSA",
  PALAVRAO = "PALAVRAO",
  PREJUDICAR = "PREJUDICAR",
  SPAM = "SPAM",
  OUTRO = "OUTRO",
}

export class CreateReviewReportDto {
  @ApiProperty({
    description: "Report reason",
    enum: ReportReasonDto,
    example: ReportReasonDto.OFENSA,
  })
  @IsEnum(ReportReasonDto, { message: "Motivo inválido" })
  reason: ReportReasonDto;

  @ApiPropertyOptional({
    description: "Report description",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: "Descrição deve ser um texto" })
  @MaxLength(1000, { message: "Descrição deve ter no máximo 1000 caracteres" })
  description?: string;
}

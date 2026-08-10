import {
  IsOptional,
  IsString,
  IsUrl,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ description: "URL do avatar" })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: "Biografia profissional" })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: "Tarifa por hora" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: "Lista de habilidades" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: "URLs do portfólio" })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  portfolio?: string[];

  @ApiPropertyOptional({ description: "Status de disponibilidade" })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

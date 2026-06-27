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
  @ApiPropertyOptional({ description: "Avatar URL" })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: "Professional bio" })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: "Hourly rate" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: "List of skills" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: "Portfolio URLs" })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  portfolio?: string[];

  @ApiPropertyOptional({ description: "Availability status" })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

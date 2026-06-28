import { IsOptional, IsUrl, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClientProfileDto {
  @ApiPropertyOptional({ description: "URL do avatar" })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: "Preferências do usuário como objeto JSON",
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

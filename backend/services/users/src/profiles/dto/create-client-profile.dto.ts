import { IsOptional, IsUrl, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClientProfileDto {
  @ApiPropertyOptional({ description: "Avatar URL" })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: "User preferences as JSON object" })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

import { IsOptional, IsUrl, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClientProfileDto {
<<<<<<< HEAD
  @ApiPropertyOptional({ description: "URL do avatar" })
=======
  @ApiPropertyOptional({ description: "Avatar URL" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

<<<<<<< HEAD
  @ApiPropertyOptional({
    description: "Preferências do usuário como objeto JSON",
  })
=======
  @ApiPropertyOptional({ description: "User preferences as JSON object" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

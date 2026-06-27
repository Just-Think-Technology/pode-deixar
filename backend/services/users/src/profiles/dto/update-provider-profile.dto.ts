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
<<<<<<< HEAD
  @ApiPropertyOptional({ description: "URL do avatar" })
=======
  @ApiPropertyOptional({ description: "Avatar URL" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

<<<<<<< HEAD
  @ApiPropertyOptional({ description: "Biografia profissional" })
=======
  @ApiPropertyOptional({ description: "Professional bio" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsString()
  bio?: string;

<<<<<<< HEAD
  @ApiPropertyOptional({ description: "Tarifa por hora" })
=======
  @ApiPropertyOptional({ description: "Hourly rate" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

<<<<<<< HEAD
  @ApiPropertyOptional({ description: "Lista de habilidades" })
=======
  @ApiPropertyOptional({ description: "List of skills" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

<<<<<<< HEAD
  @ApiPropertyOptional({ description: "URLs do portfólio" })
=======
  @ApiPropertyOptional({ description: "Portfolio URLs" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  portfolio?: string[];

<<<<<<< HEAD
  @ApiPropertyOptional({ description: "Status de disponibilidade" })
=======
  @ApiPropertyOptional({ description: "Availability status" })
>>>>>>> 68d7f77 (Develop (#13))
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsPositive,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateServiceOrderDto {
  @ApiProperty({
    description: "Título do pedido de serviço",
    example: "Preciso de um encanador para consertar vazamento",
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: "Descrição detalhada do serviço necessário",
    example:
      "O chuveiro está vazando e preciso de alguém para consertar ainda esta semana",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: "Categoria do serviço",
    example: "HIDRAULICA",
  })
  @IsString()
  @MaxLength(50)
  category: string;

  @ApiPropertyOptional({
    description: "Orçamento mínimo",
    example: 50.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({
    description: "Orçamento máximo",
    example: 200.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  budgetMax?: number;
}

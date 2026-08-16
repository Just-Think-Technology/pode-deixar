import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsPositive,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ServiceOrderAddressDto } from "./service-order-address.dto";

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
    description: "ID da categoria",
    example: "uuid-da-categoria",
  })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({
    description: "ID do prestador (para solicitação direta)",
    example: "uuid-do-prestador",
  })
  @IsOptional()
  @IsString()
  providerId?: string;

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

  @ApiPropertyOptional({
    description: "Endereço onde o serviço será realizado",
    type: ServiceOrderAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceOrderAddressDto)
  address?: ServiceOrderAddressDto;
}

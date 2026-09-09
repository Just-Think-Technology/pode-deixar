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
    description: "Service order title",
    example: "Preciso de um encanador para consertar vazamento",
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: "Detailed description of the required service",
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
    description: "Provider ID (for direct requests)",
    example: "uuid-do-prestador",
  })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({
    description: "Minimum budget",
    example: 50.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({
    description: "Maximum budget",
    example: 200.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  budgetMax?: number;

  @ApiPropertyOptional({
    description: "Address where the service will be performed",
    type: ServiceOrderAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceOrderAddressDto)
  address?: ServiceOrderAddressDto;
}

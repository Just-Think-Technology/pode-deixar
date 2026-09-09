import { IsString, IsNumber, MaxLength, IsPositive } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProviderServiceDto {
  @ApiProperty({
    description: "Service title",
    example: "Instalação de chuveiro elétrico",
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: "Detailed service description",
    example: "Instalação completa de chuveiro elétrico com garantia de 90 dias",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ description: "Fixed service price", example: 150.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  fixedPrice: number;

  @ApiProperty({ description: "Category ID", example: "uuid-da-categoria" })
  @IsString()
  categoryId: string;
}

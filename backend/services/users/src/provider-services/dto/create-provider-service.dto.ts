import { IsString, IsNumber, MaxLength, IsPositive } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProviderServiceDto {
  @ApiProperty({
    description: "Título do serviço",
    example: "Instalação de chuveiro elétrico",
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: "Descrição detalhada do serviço",
    example: "Instalação completa de chuveiro elétrico com garantia de 90 dias",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ description: "Preço fixo do serviço", example: 150.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  fixedPrice: number;

  @ApiProperty({ description: "Categoria do serviço", example: "ELETRICA" })
  @IsString()
  @MaxLength(50)
  category: string;
}

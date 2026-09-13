import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GatewayParamDto {
  @ApiProperty({
    description: "Gateway name (e.g. mercadopago)",
    example: "mercadopago",
  })
  @IsString({ message: "Gateway deve ser um texto" })
  @IsNotEmpty({ message: "Gateway não pode estar vazio" })
  gateway: string;
}

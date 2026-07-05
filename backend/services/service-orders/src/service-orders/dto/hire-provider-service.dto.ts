import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class HireProviderServiceDto {
  @ApiProperty({
    description: "ID do serviço do prestador (ProviderService)",
    example: "uuid-do-servico",
  })
  @IsString()
  providerServiceId: string;
}

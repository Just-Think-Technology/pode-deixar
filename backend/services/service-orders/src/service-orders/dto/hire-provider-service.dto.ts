import { IsString, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ServiceOrderAddressDto } from "./service-order-address.dto";

export class HireProviderServiceDto {
  @ApiProperty({
    description: "ID do serviço do prestador (ProviderService)",
    example: "uuid-do-servico",
  })
  @IsString()
  providerServiceId: string;

  @ApiPropertyOptional({
    description: "Endereço onde o serviço será realizado",
    type: ServiceOrderAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceOrderAddressDto)
  address?: ServiceOrderAddressDto;
}

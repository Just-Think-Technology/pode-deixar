// Hire provider DTO — direct hire input validation

import { IsString, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ServiceOrderAddressDto } from "./service-order-address.dto";

export class HireProviderServiceDto {
  @ApiProperty({
    description: "Provider service ID (ProviderService)",
    example: "uuid-do-servico",
  })
  @IsString()
  providerServiceId: string;

  @ApiPropertyOptional({
    description: "Address where the service will be performed",
    type: ServiceOrderAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceOrderAddressDto)
  address?: ServiceOrderAddressDto;
}

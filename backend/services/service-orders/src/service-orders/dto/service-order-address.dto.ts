import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ServiceOrderAddressDto {
  @ApiPropertyOptional({
    description: "Logradouro (rua/avenida)",
    example: "Rua Augusta",
  })
  @IsOptional()
  @IsString({ message: "street deve ser uma string" })
  @MaxLength(120, { message: "street deve ter no máximo 120 caracteres" })
  street?: string;

  @ApiPropertyOptional({
    description: "Número do imóvel",
    example: "500",
  })
  @IsOptional()
  @IsString({ message: "number deve ser uma string" })
  @MaxLength(20, { message: "number deve ter no máximo 20 caracteres" })
  number?: string;

  @ApiPropertyOptional({
    description: "Bairro",
    example: "Consolação",
  })
  @IsOptional()
  @IsString({ message: "neighborhood deve ser uma string" })
  @MaxLength(120, { message: "neighborhood deve ter no máximo 120 caracteres" })
  neighborhood?: string;

  @ApiPropertyOptional({
    description: "Cidade",
    example: "São Paulo",
  })
  @IsOptional()
  @IsString({ message: "city deve ser uma string" })
  @MaxLength(120, { message: "city deve ter no máximo 120 caracteres" })
  city?: string;

  @ApiPropertyOptional({
    description: "UF (2 letras)",
    example: "SP",
  })
  @IsOptional()
  @IsString({ message: "state deve ser uma string" })
  @MaxLength(2, { message: "state deve ter no máximo 2 caracteres" })
  state?: string;

  @ApiPropertyOptional({
    description: "CEP",
    example: "01305-000",
  })
  @IsOptional()
  @IsString({ message: "postalCode deve ser uma string" })
  @MaxLength(10, { message: "postalCode deve ter no máximo 10 caracteres" })
  postalCode?: string;
}

export function sanitizarEndereco(address?: ServiceOrderAddressDto) {
  if (!address) {
    return undefined;
  }

  const limpo: Record<string, string> = {};

  if (typeof address.street === "string" && address.street.trim().length > 0) {
    limpo.street = address.street.trim();
  }
  if (typeof address.number === "string" && address.number.trim().length > 0) {
    limpo.number = address.number.trim();
  }
  if (
    typeof address.neighborhood === "string" &&
    address.neighborhood.trim().length > 0
  ) {
    limpo.neighborhood = address.neighborhood.trim();
  }
  if (typeof address.city === "string" && address.city.trim().length > 0) {
    limpo.city = address.city.trim();
  }
  if (typeof address.state === "string" && address.state.trim().length > 0) {
    limpo.state = address.state.trim();
  }
  if (
    typeof address.postalCode === "string" &&
    address.postalCode.trim().length > 0
  ) {
    limpo.postalCode = address.postalCode.trim();
  }

  return Object.keys(limpo).length > 0 ? limpo : undefined;
}

export function formatarEndereco(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const endereco = address as Record<string, unknown>;

  return {
    street: typeof endereco.street === "string" ? endereco.street : null,
    number: typeof endereco.number === "string" ? endereco.number : null,
    neighborhood:
      typeof endereco.neighborhood === "string" ? endereco.neighborhood : null,
    city: typeof endereco.city === "string" ? endereco.city : null,
    state: typeof endereco.state === "string" ? endereco.state : null,
    postal_code:
      typeof endereco.postalCode === "string" ? endereco.postalCode : null,
  };
}

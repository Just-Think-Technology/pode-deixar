import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ServiceOrderAddressDto {
  @ApiPropertyOptional({
    description: "Street (street/avenue)",
    example: "Rua Augusta",
  })
  @IsOptional()
  @IsString({ message: "street deve ser uma string" })
  @MaxLength(120, { message: "street deve ter no máximo 120 caracteres" })
  street?: string;

  @ApiPropertyOptional({
    description: "Building number",
    example: "500",
  })
  @IsOptional()
  @IsString({ message: "number deve ser uma string" })
  @MaxLength(20, { message: "number deve ter no máximo 20 caracteres" })
  number?: string;

  @ApiPropertyOptional({
    description: "Neighborhood",
    example: "Consolação",
  })
  @IsOptional()
  @IsString({ message: "neighborhood deve ser uma string" })
  @MaxLength(120, { message: "neighborhood deve ter no máximo 120 caracteres" })
  neighborhood?: string;

  @ApiPropertyOptional({
    description: "City",
    example: "São Paulo",
  })
  @IsOptional()
  @IsString({ message: "city deve ser uma string" })
  @MaxLength(120, { message: "city deve ter no máximo 120 caracteres" })
  city?: string;

  @ApiPropertyOptional({
    description: "State (2 letters)",
    example: "SP",
  })
  @IsOptional()
  @IsString({ message: "state deve ser uma string" })
  @MaxLength(2, { message: "state deve ter no máximo 2 caracteres" })
  state?: string;

  @ApiPropertyOptional({
    description: "Postal code",
    example: "01305-000",
  })
  @IsOptional()
  @IsString({ message: "postalCode deve ser uma string" })
  @MaxLength(10, { message: "postalCode deve ter no máximo 10 caracteres" })
  postalCode?: string;
}

export function sanitizeAddress(address?: ServiceOrderAddressDto) {
  if (!address) {
    return undefined;
  }

  const cleaned: Record<string, string> = {};

  if (typeof address.street === "string" && address.street.trim().length > 0) {
    cleaned.street = address.street.trim();
  }
  if (typeof address.number === "string" && address.number.trim().length > 0) {
    cleaned.number = address.number.trim();
  }
  if (
    typeof address.neighborhood === "string" &&
    address.neighborhood.trim().length > 0
  ) {
    cleaned.neighborhood = address.neighborhood.trim();
  }
  if (typeof address.city === "string" && address.city.trim().length > 0) {
    cleaned.city = address.city.trim();
  }
  if (typeof address.state === "string" && address.state.trim().length > 0) {
    cleaned.state = address.state.trim();
  }
  if (
    typeof address.postalCode === "string" &&
    address.postalCode.trim().length > 0
  ) {
    cleaned.postalCode = address.postalCode.trim();
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function formatAddress(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const addressData = address as Record<string, unknown>;

  return {
    street: typeof addressData.street === "string" ? addressData.street : null,
    number: typeof addressData.number === "string" ? addressData.number : null,
    neighborhood:
      typeof addressData.neighborhood === "string"
        ? addressData.neighborhood
        : null,
    city: typeof addressData.city === "string" ? addressData.city : null,
    state: typeof addressData.state === "string" ? addressData.state : null,
    postal_code:
      typeof addressData.postalCode === "string"
        ? addressData.postalCode
        : null,
  };
}

// Only expose city/state on the showcase; the full address stays restricted
// to the authenticated order detail.
export function formatAddressSummary(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const addressData = address as Record<string, unknown>;

  return {
    city: typeof addressData.city === "string" ? addressData.city : null,
    state: typeof addressData.state === "string" ? addressData.state : null,
  };
}

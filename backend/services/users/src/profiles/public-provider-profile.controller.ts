import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { ProfilesService } from "./profiles.service";

@ApiTags("Perfil Público do Prestador")
@Controller("providers/:providerId/profile")
export class PublicProviderProfileController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: "Visualizar perfil público de um prestador" })
  @ApiParam({
    name: "providerId",
    description: "ID do perfil do prestador",
  })
  @ApiResponse({
    status: 200,
    description: "Perfil público retornado com sucesso",
  })
  @ApiNotFoundResponse({ description: "Perfil de prestador não encontrado" })
  async getPublicProviderProfile(
    @Param("providerId") providerProfileId: string,
  ) {
    return this.profilesService.getPublicProviderProfile(providerProfileId);
  }
}

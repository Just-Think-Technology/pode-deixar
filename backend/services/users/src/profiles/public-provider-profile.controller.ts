import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { ProfilesService } from "./profiles.service";

@ApiTags("Provider Public Profile")
@Controller("providers/:providerId/profile")
export class PublicProviderProfileController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: "View public profile of a provider" })
  @ApiParam({
    name: "providerId",
    description: "Provider profile ID",
  })
  @ApiResponse({
    status: 200,
    description: "Public profile returned successfully",
  })
  @ApiNotFoundResponse({ description: "Provider profile not found" })
  async getPublicProviderProfile(
    @Param("providerId", ParseUUIDPipe) providerProfileId: string,
  ) {
    return this.profilesService.getPublicProviderProfile(providerProfileId);
  }
}

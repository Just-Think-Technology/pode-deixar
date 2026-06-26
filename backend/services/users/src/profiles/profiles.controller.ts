import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { ProfilesService } from "./profiles.service";
import { CreateClientProfileDto } from "./dto/create-client-profile.dto";
import { UpdateClientProfileDto } from "./dto/update-client-profile.dto";
import { CreateProviderProfileDto } from "./dto/create-provider-profile.dto";
import { UpdateProviderProfileDto } from "./dto/update-provider-profile.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Profiles")
@Controller("profiles")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
  @ApiResponse({ status: 404, description: "Profile not found" })
  async getMyProfile(@Request() req: any) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.profilesService.getProfile(userId, role);
  }

  @Post("client")
  @Roles("CLIENT")
  @ApiOperation({ summary: "Create client profile" })
  @ApiResponse({
    status: 201,
    description: "Client profile created successfully",
  })
  @ApiResponse({ status: 409, description: "Profile already exists" })
  async createClientProfile(
    @Request() req: any,
    @Body() dto: CreateClientProfileDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.profilesService.createClientProfile(userId, dto, ip);
  }

  @Patch("client")
  @Roles("CLIENT")
  @ApiOperation({ summary: "Update client profile" })
  @ApiResponse({
    status: 200,
    description: "Client profile updated successfully",
  })
  @ApiResponse({ status: 404, description: "Profile not found" })
  async updateClientProfile(
    @Request() req: any,
    @Body() dto: UpdateClientProfileDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.profilesService.updateClientProfile(userId, dto, ip);
  }

  @Post("provider")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Create provider profile" })
  @ApiResponse({
    status: 201,
    description: "Provider profile created successfully",
  })
  @ApiResponse({ status: 409, description: "Profile already exists" })
  async createProviderProfile(
    @Request() req: any,
    @Body() dto: CreateProviderProfileDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.profilesService.createProviderProfile(userId, dto, ip);
  }

  @Patch("provider")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Update provider profile" })
  @ApiResponse({
    status: 200,
    description: "Provider profile updated successfully",
  })
  @ApiResponse({ status: 404, description: "Profile not found" })
  async updateProviderProfile(
    @Request() req: any,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.profilesService.updateProviderProfile(userId, dto, ip);
  }

  @Patch("avatar")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Upload avatar" })
  @ApiResponse({ status: 200, description: "Avatar uploaded successfully" })
  @ApiResponse({ status: 404, description: "Profile not found" })
  async uploadAvatar(
    @Request() req: any,
    @Body("avatarUrl") avatarUrl: string,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    const ip = req.ip;
    return this.profilesService.uploadAvatar(userId, role, avatarUrl, ip);
  }
}

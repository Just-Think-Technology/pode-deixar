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

@ApiTags("Perfis")
@Controller("profiles")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
  @ApiOperation({ summary: "Obter perfil do usuário atual" })
  @ApiResponse({ status: 200, description: "Perfil recuperado com sucesso" })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
  async getMyProfile(@Request() req: any) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.profilesService.getProfile(userId, role);
  }

  @Post("client")
  @Roles("CLIENT")
  @ApiOperation({ summary: "Criar perfil de cliente" })
  @ApiResponse({
    status: 201,
    description: "Perfil de cliente criado com sucesso",
  })
  @ApiResponse({ status: 409, description: "Perfil já existe" })
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
  @ApiOperation({ summary: "Atualizar perfil de cliente" })
  @ApiResponse({
    status: 200,
    description: "Perfil de cliente atualizado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
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
  @ApiOperation({ summary: "Criar perfil de prestador" })
  @ApiResponse({
    status: 201,
    description: "Perfil de prestador criado com sucesso",
  })
  @ApiResponse({ status: 409, description: "Perfil já existe" })
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
  @ApiOperation({ summary: "Atualizar perfil de prestador" })
  @ApiResponse({
    status: 200,
    description: "Perfil de prestador atualizado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
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
  @ApiOperation({ summary: "Enviar avatar" })
  @ApiResponse({ status: 200, description: "Avatar enviado com sucesso" })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
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

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
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
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Formato de imagem inválido. Permitidos: JPEG, PNG, WebP, GIF",
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({ summary: "Enviar avatar" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Arquivo de imagem (JPEG, PNG, WebP ou GIF, máx 2MB)",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Avatar enviado com sucesso" })
  @ApiResponse({ status: 400, description: "Arquivo inválido" })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Arquivo não enviado");
    }

    const userId = req.user.sub;
    const role = req.user.role;
    const ip = req.ip;
    return this.profilesService.uploadAvatar(userId, role, file, ip);
  }
}

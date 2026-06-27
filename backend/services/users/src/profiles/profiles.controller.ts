import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
<<<<<<< HEAD
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
=======
  Request,
>>>>>>> 68d7f77 (Develop (#13))
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
<<<<<<< HEAD
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
=======
} from "@nestjs/swagger";
>>>>>>> 68d7f77 (Develop (#13))
import { ProfilesService } from "./profiles.service";
import { CreateClientProfileDto } from "./dto/create-client-profile.dto";
import { UpdateClientProfileDto } from "./dto/update-client-profile.dto";
import { CreateProviderProfileDto } from "./dto/create-provider-profile.dto";
import { UpdateProviderProfileDto } from "./dto/update-provider-profile.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

<<<<<<< HEAD
@ApiTags("Perfis")
=======
@ApiTags("Profiles")
>>>>>>> 68d7f77 (Develop (#13))
@Controller("profiles")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  @Roles("CLIENT", "PROVIDER")
<<<<<<< HEAD
  @ApiOperation({ summary: "Obter perfil do usuário atual" })
  @ApiResponse({ status: 200, description: "Perfil recuperado com sucesso" })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
=======
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
  @ApiResponse({ status: 404, description: "Profile not found" })
>>>>>>> 68d7f77 (Develop (#13))
  async getMyProfile(@Request() req: any) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.profilesService.getProfile(userId, role);
  }

  @Post("client")
  @Roles("CLIENT")
<<<<<<< HEAD
  @ApiOperation({ summary: "Criar perfil de cliente" })
  @ApiResponse({
    status: 201,
    description: "Perfil de cliente criado com sucesso",
  })
  @ApiResponse({ status: 409, description: "Perfil já existe" })
=======
  @ApiOperation({ summary: "Create client profile" })
  @ApiResponse({
    status: 201,
    description: "Client profile created successfully",
  })
  @ApiResponse({ status: 409, description: "Profile already exists" })
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
  @ApiOperation({ summary: "Atualizar perfil de cliente" })
  @ApiResponse({
    status: 200,
    description: "Perfil de cliente atualizado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
=======
  @ApiOperation({ summary: "Update client profile" })
  @ApiResponse({
    status: 200,
    description: "Client profile updated successfully",
  })
  @ApiResponse({ status: 404, description: "Profile not found" })
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
  @ApiOperation({ summary: "Criar perfil de prestador" })
  @ApiResponse({
    status: 201,
    description: "Perfil de prestador criado com sucesso",
  })
  @ApiResponse({ status: 409, description: "Perfil já existe" })
=======
  @ApiOperation({ summary: "Create provider profile" })
  @ApiResponse({
    status: 201,
    description: "Provider profile created successfully",
  })
  @ApiResponse({ status: 409, description: "Profile already exists" })
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
  @ApiOperation({ summary: "Atualizar perfil de prestador" })
  @ApiResponse({
    status: 200,
    description: "Perfil de prestador atualizado com sucesso",
  })
  @ApiResponse({ status: 404, description: "Perfil não encontrado" })
=======
  @ApiOperation({ summary: "Update provider profile" })
  @ApiResponse({
    status: 200,
    description: "Provider profile updated successfully",
  })
  @ApiResponse({ status: 404, description: "Profile not found" })
>>>>>>> 68d7f77 (Develop (#13))
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 68d7f77 (Develop (#13))
  }
}

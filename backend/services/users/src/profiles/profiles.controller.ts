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
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

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
  @ApiOperation({ summary: "Upload avatar" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Image file (JPEG, PNG, WebP or GIF, max 2MB)",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Avatar uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file" })
  @ApiResponse({ status: 404, description: "Profile not found" })
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

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ParseUUIDPipe,
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
import { ServiceImagesService } from "./service-images.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { memoryStorage } from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function fileFilter(
  _req: any,
  _file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (ALLOWED_MIMES.includes(_file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        "Formato de imagem inválido. Permitidos: JPEG, PNG, WebP, GIF",
      ),
      false,
    );
  }
}

@ApiTags("Imagens do Serviço")
@Controller("providers/me/services/:serviceId/images")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("PROVIDER")
export class ServiceImagesController {
  constructor(private readonly serviceImagesService: ServiceImagesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter,
    }),
  )
  @ApiOperation({ summary: "Fazer upload de imagem para um serviço" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Arquivo de imagem (JPEG, PNG, WebP ou GIF, máx 5MB)",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Imagem enviada com sucesso" })
  @ApiResponse({ status: 400, description: "Arquivo inválido" })
  @ApiResponse({ status: 404, description: "Serviço não encontrado" })
  async upload(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Arquivo não enviado");
    }

    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceImagesService.uploadByUserId(
      userId,
      serviceId,
      file,
      ip,
    );
  }

  @Get()
  @ApiOperation({ summary: "Listar imagens de um serviço" })
  @ApiResponse({ status: 200, description: "Lista de imagens retornada" })
  @ApiResponse({ status: 404, description: "Serviço não encontrado" })
  async list(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
  ) {
    const userId = req.user.sub;
    return this.serviceImagesService.listByUserId(userId, serviceId);
  }

  @Delete(":imageId")
  @ApiOperation({ summary: "Remover imagem de um serviço" })
  @ApiResponse({ status: 200, description: "Imagem removida com sucesso" })
  @ApiResponse({ status: 404, description: "Imagem ou serviço não encontrado" })
  async delete(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Param("imageId", ParseUUIDPipe) imageId: string,
  ) {
    const userId = req.user.sub;
    const ip = req.ip;
    return this.serviceImagesService.deleteByUserId(
      userId,
      serviceId,
      imageId,
      ip,
    );
  }
}

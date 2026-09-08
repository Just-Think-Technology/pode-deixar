import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { PhotosService } from "./photos.service";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";

@ApiTags("Fotos do Pedido")
@Controller("services/me/:orderId/photos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @Roles("CLIENT")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor("photos", 10, {
      limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    }),
  )
  @ApiOperation({ summary: "Enviar fotos do local de trabalho (máx 10)" })
  @ApiParam({ name: "orderId", description: "ID do pedido" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        photos: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  async upload(
    @Request() req: any,
    @Param("orderId") orderId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }

    return this.photosService.upload(orderId, req.user.sub, files);
  }
}

@ApiTags("Fotos do Pedido")
@Controller("services/photos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhotoViewController {
  constructor(private readonly photosService: PhotosService) {}

  @Get(":photoId/view")
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({
    summary: "Obter URL temporária para visualizar uma foto do pedido",
    description:
      "Retorna URL pré-assinada do MinIO com expiração de 15 minutos. Permitido ao cliente dono do pedido, a prestador com proposta no pedido ou a ADMIN.",
  })
  @ApiParam({ name: "photoId", description: "ID da foto" })
  @ApiResponse({
    status: 200,
    description: "URL temporária gerada com sucesso",
  })
  @ApiResponse({ status: 401, description: "Token ausente ou inválido" })
  @ApiResponse({ status: 403, description: "Acesso negado a esta foto" })
  @ApiResponse({ status: 404, description: "Foto não encontrada" })
  async view(@Request() req: any, @Param("photoId") photoId: string) {
    return this.photosService.obterUrlVisualizacao(
      photoId,
      req.user.sub,
      req.user.role,
    );
  }
}

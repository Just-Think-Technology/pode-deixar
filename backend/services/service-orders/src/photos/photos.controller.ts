import {
  Controller,
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
} from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { PhotosService } from "./photos.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@ApiTags("Fotos do Pedido")
@Controller("services/me/:orderId/photos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @Roles("CLIENT")
  @UseInterceptors(FilesInterceptor("photos", 10))
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

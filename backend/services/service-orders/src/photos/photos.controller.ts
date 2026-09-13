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
  ParseUUIDPipe,
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

@ApiTags("Order Photos")
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
  @ApiOperation({ summary: "Upload workplace photos (max 10)" })
  @ApiParam({ name: "orderId", description: "Order ID" })
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
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }

    return this.photosService.upload(orderId, req.user.sub, files);
  }
}

@ApiTags("Order Photos")
@Controller("services/photos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhotoViewController {
  constructor(private readonly photosService: PhotosService) {}

  @Get(":photoId/view")
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({
    summary: "Get a temporary URL to view an order photo",
    description:
      "Returns a pre-signed MinIO URL expiring in 15 minutes. Allowed for the owning client, a provider with a proposal on the order, or ADMIN.",
  })
  @ApiParam({ name: "photoId", description: "Photo ID" })
  @ApiResponse({
    status: 200,
    description: "Temporary URL generated successfully",
  })
  @ApiResponse({ status: 401, description: "Missing or invalid token" })
  @ApiResponse({ status: 403, description: "Access denied to this photo" })
  @ApiResponse({ status: 404, description: "Photo not found" })
  async view(
    @Request() req: any,
    @Param("photoId", ParseUUIDPipe) photoId: string,
  ) {
    return this.photosService.getViewUrl(photoId, req.user.sub, req.user.role);
  }
}

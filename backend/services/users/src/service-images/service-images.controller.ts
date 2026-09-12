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
import { ServiceImagesService } from "./service-images.service";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";
import { createImageFileInterceptor } from "@pode-deixar/storage";

@ApiTags("Service Images")
@Controller("providers/me/services/:serviceId/images")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("PROVIDER")
export class ServiceImagesController {
  constructor(private readonly serviceImagesService: ServiceImagesService) {}

  @Post()
  @UseInterceptors(createImageFileInterceptor())
  @ApiOperation({ summary: "Upload an image for a service" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Image file (JPEG, PNG, WebP or GIF, max 5MB)",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Image uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file" })
  @ApiResponse({ status: 404, description: "Service not found" })
  async upload(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ id: string; url: string; created_at: Date }> {
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
  @ApiOperation({ summary: "List images of a service" })
  @ApiResponse({ status: 200, description: "Image list returned" })
  @ApiResponse({ status: 404, description: "Service not found" })
  async list(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
  ): Promise<{ id: string; url: string; created_at: Date }[]> {
    const userId = req.user.sub;
    return this.serviceImagesService.listByUserId(userId, serviceId);
  }

  @Delete(":imageId")
  @ApiOperation({ summary: "Remove an image from a service" })
  @ApiResponse({ status: 200, description: "Image removed successfully" })
  @ApiResponse({ status: 404, description: "Image or service not found" })
  async delete(
    @Request() req: any,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Param("imageId", ParseUUIDPipe) imageId: string,
  ): Promise<{ message: string }> {
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

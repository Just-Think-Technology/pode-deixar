// Photos controller — order photo upload and viewing

import {
  Controller,
  Get,
  Post,
  Delete,
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
import {
  FilesInterceptor,
  AnyFilesInterceptor,
} from "@nestjs/platform-express";
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

@ApiTags("Order Photos — Completion")
@Controller("services/me/:orderId/completion-photos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompletionPhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @Roles("PROVIDER")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    }),
  )
  @ApiOperation({
    summary: "Upload completion evidence photos (provider, IN_PROGRESS)",
  })
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
        file: { type: "string", format: "binary" },
      },
    },
  })
  async uploadCompletion(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }

    const uploaded = await this.photosService.uploadCompletion(
      orderId,
      req.user.sub,
      files,
    );

    // Frontend currently sends one file per request (`file` field) and expects
    // a single `CompletionPhoto` object; multi-file spec callers receive an array.
    // Keep both contracts without a frontend change.
    if (uploaded.length === 1) {
      return uploaded[0];
    }
    return uploaded;
  }

  @Delete(":photoId")
  @Roles("PROVIDER")
  @ApiOperation({ summary: "Delete a completion evidence photo (provider)" })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiParam({ name: "photoId", description: "Photo ID" })
  async deleteCompletion(
    @Request() req: any,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Param("photoId", ParseUUIDPipe) photoId: string,
  ) {
    return this.photosService.deleteCompletionPhoto(
      orderId,
      photoId,
      req.user.sub,
    );
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

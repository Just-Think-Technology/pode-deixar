// Order photo pipeline — deep module for evidence photo validation and conversion
// Delegates the WebP triple (validate + sharp 25M + webp 80 + minio) to shared ImagePipeline

import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { PhotosRepository } from "../photos/photos.repository";
import { MinioService } from "@pode-deixar/storage";
import { ImagePipeline } from "@pode-deixar/storage";

// --- Interface for test via interface ---

export interface OrderPhotoPipelinePort {
  validateFiles(files: Express.Multer.File[] | null | undefined): void;
  convertToWebp(files: Express.Multer.File[]): Promise<Buffer[]>;
  processFiles(
    files: Express.Multer.File[] | null | undefined,
  ): Promise<Buffer[]>;
  uploadPhotos(orderId: string, webpBuffers: Buffer[]): Promise<any[]>;
  handleUpload(
    orderId: string,
    files: Express.Multer.File[] | null | undefined,
  ): Promise<{ uploadedCount: number; photos: any[] }>;
}

// --- Implementation ---

/**
 * Encapsulates image validation, webp conversion and storage upload.
 * Keeps sharp/pixel-limit and validateImageFile rules in one home via shared ImagePipeline.
 */
@Injectable()
export class OrderPhotoPipeline implements OrderPhotoPipelinePort {
  private readonly pipeline: ImagePipeline;

  constructor(
    @Optional() private photosRepository?: PhotosRepository,
    @Optional() private minio?: MinioService,
    @Optional() imagePipeline?: ImagePipeline,
  ) {
    this.pipeline = imagePipeline ?? new ImagePipeline(minio);
  }

  validateFiles(files: Express.Multer.File[] | null | undefined): void {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return;
    }
    // Delegate quota + magic-byte validation to shared pipeline (single home)
    this.pipeline.validateFiles(files);
  }

  async convertToWebp(files: Express.Multer.File[]): Promise<Buffer[]> {
    return this.pipeline.processFiles(files);
  }

  async processFiles(
    files: Express.Multer.File[] | null | undefined,
  ): Promise<Buffer[]> {
    return this.pipeline.processFiles(files);
  }

  async uploadPhotos(orderId: string, webpBuffers: Buffer[]): Promise<any[]> {
    if (!this.photosRepository || !this.minio) {
      throw new BadRequestException("Serviço de fotos indisponível");
    }
    if (webpBuffers.length === 0) {
      return [];
    }
    return this.photosRepository.uploadPhotos(
      orderId,
      webpBuffers,
      (fileName, buffer, mimeType) =>
        this.minio!.uploadFile(fileName, buffer, mimeType),
    );
  }

  async handleUpload(
    orderId: string,
    files: Express.Multer.File[] | null | undefined,
  ): Promise<{ uploadedCount: number; photos: any[] }> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return { uploadedCount: 0, photos: [] };
    }
    const webpBuffers = await this.pipeline.processFiles(files);

    if (!this.photosRepository || !this.minio) {
      throw new BadRequestException("Serviço de fotos indisponível");
    }

    const photos = await this.photosRepository.uploadPhotos(
      orderId,
      webpBuffers,
      (fileName, buffer, mimeType) =>
        this.minio!.uploadFile(fileName, buffer, mimeType),
    );
    return { uploadedCount: files.length, photos };
  }
}

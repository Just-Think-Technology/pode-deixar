// Order photo pipeline — deep module for evidence photo validation and conversion

import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { validateImageFile } from "@pode-deixar/validation";
import { PhotosRepository } from "../photos/photos.repository";
import { MinioService } from "@pode-deixar/storage";
import sharp from "sharp";

const SHARP_PIXEL_LIMIT = 25_000_000;

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
 * Keeps sharp/pixel-limit and validateImageFile rules in one home.
 */
@Injectable()
export class OrderPhotoPipeline implements OrderPhotoPipelinePort {
  constructor(
    @Optional() private photosRepository?: PhotosRepository,
    @Optional() private minio?: MinioService,
  ) {}

  validateFiles(files: Express.Multer.File[] | null | undefined): void {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return;
    }
    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }
    for (const file of files) {
      validateImageFile(file.originalname, file.buffer);
    }
  }

  async convertToWebp(files: Express.Multer.File[]): Promise<Buffer[]> {
    const webpBuffers: Buffer[] = [];
    for (const file of files) {
      try {
        const webpBuffer = await sharp(file.buffer, {
          limitInputPixels: SHARP_PIXEL_LIMIT,
        })
          .webp({ quality: 80 })
          .toBuffer();
        webpBuffers.push(webpBuffer);
      } catch {
        throw new BadRequestException(
          `Imagem inválida ou corrompida: "${file.originalname}"`,
        );
      }
    }
    return webpBuffers;
  }

  async processFiles(
    files: Express.Multer.File[] | null | undefined,
  ): Promise<Buffer[]> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return [];
    }
    this.validateFiles(files);
    return this.convertToWebp(files);
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
    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }
    for (const file of files) {
      validateImageFile(file.originalname, file.buffer);
    }

    const webpBuffers = await this.convertToWebp(files);

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

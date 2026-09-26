// Image pipeline — deep module for photo WebP pipeline triple

import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { validateImageFile } from "@pode-deixar/validation";
import sharp from "sharp";
import { StorageService } from "./storage.service";

// --- Constants ---

export const SHARP_PIXEL_LIMIT = 25_000_000;
export const WEBP_QUALITY = 80;

// --- Interface for test via interface ---

export interface ImagePipelinePort {
  validateFile(file: Express.Multer.File): void;
  validateFiles(files: Express.Multer.File[]): void;
  convertToWebp(buffer: Buffer, originalname: string): Promise<Buffer>;
  processFile(file: Express.Multer.File): Promise<Buffer>;
  processFiles(
    files: Express.Multer.File[] | null | undefined,
  ): Promise<Buffer[]>;
  upload(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    bucket?: string,
  ): Promise<string>;
  processAndUpload(
    file: Express.Multer.File,
    fileName: string,
    bucket?: string,
  ): Promise<string>;
}

// --- Implementation ---

/**
 * Deep module encapsulating validateImageFile + sharp 25M pixel cap + webp 80 + storage upload.
 * Single home for the triple so the 3 call sites (photos upload, photos completion, finish) reuse it.
 */
@Injectable()
export class ImagePipeline implements ImagePipelinePort {
  constructor(@Optional() private readonly storage?: StorageService) {}

  validateFile(file: Express.Multer.File): void {
    validateImageFile(file.originalname, file.buffer);
  }

  validateFiles(files: Express.Multer.File[]): void {
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }
    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }
    for (const file of files) {
      this.validateFile(file);
    }
  }

  async convertToWebp(buffer: Buffer, originalname: string): Promise<Buffer> {
    try {
      return await sharp(buffer, {
        limitInputPixels: SHARP_PIXEL_LIMIT,
      })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        `Imagem inválida ou corrompida: "${originalname}"`,
      );
    }
  }

  async processFile(file: Express.Multer.File): Promise<Buffer> {
    this.validateFile(file);
    return this.convertToWebp(file.buffer, file.originalname);
  }

  async processFiles(
    files: Express.Multer.File[] | null | undefined,
  ): Promise<Buffer[]> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return [];
    }
    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }
    for (const file of files) {
      this.validateFile(file);
    }
    const buffers: Buffer[] = [];
    for (const file of files) {
      const webp = await this.convertToWebp(file.buffer, file.originalname);
      buffers.push(webp);
    }
    return buffers;
  }

  async upload(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    bucket?: string,
  ): Promise<string> {
    if (!this.storage) {
      throw new BadRequestException("Serviço de fotos indisponível");
    }
    return this.storage.uploadFile(fileName, buffer, mimeType, bucket);
  }

  async processAndUpload(
    file: Express.Multer.File,
    fileName: string,
    bucket?: string,
  ): Promise<string> {
    const webp = await this.processFile(file);
    return this.upload(fileName, webp, "image/webp", bucket);
  }
}

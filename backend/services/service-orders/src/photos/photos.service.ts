// Photos service — order photo uploads and signed viewing

import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { MinioService } from "../storage/minio.service";
import sharp from "sharp";
import * as crypto from "crypto";
import { validarArquivoImagem } from "@pode-deixar/validation";

// Pixel cap guards against decompression bombs while still covering phone
// photos without exhausting worker memory.
const SHARP_PIXEL_LIMIT = 25_000_000;
const MAX_PHOTOS_PER_ORDER = 10;
const WEBP_QUALITY = 80;

@Injectable()
export class PhotosService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  // --- Public API ---

  /**
   * Uploads order photos, converting them to webp.
   * Only the owning client may attach photos, only on OPEN orders, and the
   * total quota is enforced inside the transaction against concurrent uploads.
   */
  async upload(
    orderId: string,
    clientId: string,
    files: Express.Multer.File[],
  ) {
    const order = await this.findOrderOrThrow(orderId);
    // Boundary guard against parameter tampering: a forged non-array payload
    // (e.g. a plain string field) must be rejected before any array access
    // below, where `.length` and iteration would silently misbehave.
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }
    this.assertUploadAllowed(order, clientId, files);
    this.validateImageFiles(files);
    const webpBuffers = await this.convertToWebp(files);
    return this.persistPhotos(orderId, files.length, webpBuffers);
  }

  private async findOrderOrThrow(orderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException("Pedido não encontrado");
    }
    return order;
  }

  private assertUploadAllowed(
    order: { clientId: string; status: string },
    clientId: string,
    files: Express.Multer.File[],
  ): void {
    if (order.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence ao cliente");
    }

    // Only allow uploads on open orders to keep attachments off orders that
    // already left the showcase.
    if (order.status !== "OPEN") {
      throw new BadRequestException(
        "Só é possível enviar fotos para pedidos com status aberto",
      );
    }

    if (files.length > MAX_PHOTOS_PER_ORDER) {
      throw new BadRequestException(
        `Máximo de ${MAX_PHOTOS_PER_ORDER} fotos por upload`,
      );
    }
  }

  private validateImageFiles(files: Express.Multer.File[]): void {
    // Canonical image validation (extension + magic bytes) in the shared
    // package — same rule as the users avatar/service upload.
    for (const file of files) {
      validarArquivoImagem(file.originalname, file.buffer);
    }
  }

  private async convertToWebp(
    files: Express.Multer.File[],
  ): Promise<Buffer[]> {
    const webpBuffers: Buffer[] = [];
    for (const file of files) {
      try {
        const webpBuffer = await sharp(file.buffer, {
          limitInputPixels: SHARP_PIXEL_LIMIT,
        })
          .webp({ quality: WEBP_QUALITY })
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

  // Enforce the quota and create rows in one transaction to prevent overruns
  // under concurrent uploads.
  private async persistPhotos(
    orderId: string,
    fileCount: number,
    webpBuffers: Buffer[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.orderPhoto.count({
        where: { serviceOrderId: orderId },
      });

      if (existingCount + fileCount > MAX_PHOTOS_PER_ORDER) {
        throw new BadRequestException(
          `O pedido pode ter no máximo ${MAX_PHOTOS_PER_ORDER} fotos no total`,
        );
      }

      const uploaded = [];

      for (let i = 0; i < webpBuffers.length; i++) {
        // eslint-disable-next-line security/detect-object-injection -- numeric loop index, not a user-controlled key
        const webpBuffer = webpBuffers[i];
        const fileName = `${orderId}/${crypto.randomUUID()}.webp`;

        const url = await this.minio.uploadFile(
          fileName,
          webpBuffer,
          "image/webp",
        );

        const photo = await tx.orderPhoto.create({
          data: {
            serviceOrderId: orderId,
            url,
          },
        });

        uploaded.push({
          id: photo.id,
          // Private bucket, so expose the authenticated endpoint like the order detail does.
          url: `/api/services/photos/${photo.id}/view`,
          created_at: photo.createdAt,
        });
      }

      return uploaded;
    });
  }

  async getViewUrl(photoId: string, userId: string, role: string) {
    const photo = await this.prisma.orderPhoto.findUnique({
      where: { id: photoId },
      include: {
        serviceOrder: { select: { id: true, clientId: true } },
      },
    });

    if (!photo || !photo.serviceOrder) {
      throw new NotFoundException("Foto não encontrada");
    }

    const order = photo.serviceOrder;

    if (role === "ADMIN" || order.clientId === userId) {
      return this.buildViewResponse(photo.url);
    }

    if (role === "PROVIDER") {
      const proposal = await this.prisma.proposal.findFirst({
        where: { serviceOrderId: order.id, providerId: userId },
        select: { id: true },
      });

      if (proposal) {
        return this.buildViewResponse(photo.url);
      }
    }

    throw new ForbiddenException("Acesso negado a esta foto");
  }

  // --- Private Helpers ---

  private async buildViewResponse(storedUrl: string) {
    const fileName = this.minio.extractFileName(storedUrl);
    const url = await this.minio.generateTemporaryUrl(fileName);
    return { url };
  }
}

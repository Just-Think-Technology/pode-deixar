import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../storage/minio.service";
import sharp from "sharp";
import * as crypto from "crypto";

// Pixel cap guards against decompression bombs while still covering phone
// photos without exhausting worker memory.
const SHARP_PIXEL_LIMIT = 25_000_000;

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// The client-provided multipart mimetype is untrusted, so verify magic bytes
// against the declared type.
function isImageContentValid(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  if (mimetype === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimetype === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimetype === "image/gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }

  if (mimetype === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

@Injectable()
export class PhotosService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async upload(
    orderId: string,
    clientId: string,
    files: Express.Multer.File[],
  ) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException("Pedido não encontrado");
    }

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

    // Check Array.isArray first: a forged non-array with `length` would
    // confuse the quota checks below.
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }

    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Tipo de arquivo inválido: ${file.mimetype}. Apenas imagens são permitidas (jpeg, png, webp, gif)`,
        );
      }

      if (!isImageContentValid(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          `O conteúdo do arquivo "${file.originalname}" não corresponde a uma imagem válida (jpeg, png, webp ou gif)`,
        );
      }
    }

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

    // Enforce the quota and create rows in one transaction to prevent overruns
    // under concurrent uploads.
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.orderPhoto.count({
        where: { serviceOrderId: orderId },
      });

      if (existingCount + files.length > 10) {
        throw new BadRequestException(
          "O pedido pode ter no máximo 10 fotos no total",
        );
      }

      const uploaded = [];

      for (let i = 0; i < files.length; i++) {
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

  private async buildViewResponse(storedUrl: string) {
    const fileName = this.minio.extractFileName(storedUrl);
    const url = await this.minio.generateTemporaryUrl(fileName);
    return { url };
  }
}

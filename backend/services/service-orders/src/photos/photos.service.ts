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

    // Validação canônica de imagem (extensão + magic bytes) no pacote
    // compartilhado — mesma regra do upload de avatar/serviço do users.
    for (const file of files) {
      validarArquivoImagem(file.originalname, file.buffer);
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

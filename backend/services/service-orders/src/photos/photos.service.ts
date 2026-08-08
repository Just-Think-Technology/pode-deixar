import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../storage/minio.service";
import sharp from "sharp";
import * as crypto from "crypto";

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
      throw new BadRequestException("Pedido não encontrado");
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException("Pedido não pertence ao cliente");
    }

    if (!files || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }

    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }

    const existingCount = await this.prisma.orderPhoto.count({
      where: { serviceOrderId: orderId },
    });

    if (existingCount + files.length > 10) {
      throw new BadRequestException(
        "O pedido pode ter no máximo 10 fotos no total",
      );
    }

    const uploaded = [];

    for (const file of files) {
      const webpBuffer = await sharp(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${orderId}/${crypto.randomUUID()}.webp`;

      const url = await this.minio.uploadFile(
        fileName,
        webpBuffer,
        "image/webp",
      );

      const photo = await this.prisma.orderPhoto.create({
        data: {
          serviceOrderId: orderId,
          url,
        },
      });

      uploaded.push({
        id: photo.id,
        url: photo.url,
        created_at: photo.createdAt,
      });
    }

    return uploaded;
  }
}

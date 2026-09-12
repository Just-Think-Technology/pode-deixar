import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";

type TransactionClient = Prisma.TransactionClient;

export type UploadFileFn = (
  fileName: string,
  buffer: Buffer,
  mimeType: string,
) => Promise<string>;

const MAX_PHOTOS_PER_ORDER = 10;

@Injectable()
export class PhotosRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrderById(orderId: string) {
    return this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
    });
  }

  // Quota is enforced inside the transaction so concurrent uploads cannot
  // push an order past the limit; storage upload stays with the caller via
  // uploadFile to keep MinIO out of the persistence layer.
  uploadPhotos(
    orderId: string,
    webpBuffers: Buffer[],
    uploadFile: UploadFileFn,
  ) {
    return this.prisma.$transaction(async (tx: TransactionClient) => {
      const existingCount = await tx.orderPhoto.count({
        where: { serviceOrderId: orderId },
      });

      if (existingCount + webpBuffers.length > MAX_PHOTOS_PER_ORDER) {
        throw new BadRequestException(
          "O pedido pode ter no máximo 10 fotos no total",
        );
      }

      const uploaded = [];

      for (let i = 0; i < webpBuffers.length; i++) {
        // eslint-disable-next-line security/detect-object-injection -- numeric loop index, not a user-controlled key
        const webpBuffer = webpBuffers[i];
        const fileName = `${orderId}/${crypto.randomUUID()}.webp`;

        const url = await uploadFile(fileName, webpBuffer, "image/webp");

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

  findPhotoWithOrderById(photoId: string) {
    return this.prisma.orderPhoto.findUnique({
      where: { id: photoId },
      include: {
        serviceOrder: { select: { id: true, clientId: true } },
      },
    });
  }

  findProposalForViewer(serviceOrderId: string, providerId: string) {
    return this.prisma.proposal.findFirst({
      where: { serviceOrderId, providerId },
      select: { id: true },
    });
  }
}

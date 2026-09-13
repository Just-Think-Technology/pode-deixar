import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PhotosRepository } from "./photos.repository";
import { MinioService } from "@pode-deixar/storage";
import sharp from "sharp";
import { validateImageFile } from "@pode-deixar/validation";

// Pixel cap guards against decompression bombs while still covering phone
// photos without exhausting worker memory.
const SHARP_PIXEL_LIMIT = 25_000_000;

@Injectable()
export class PhotosService {
  constructor(
    private repository: PhotosRepository,
    private minio: MinioService,
  ) {}

  async upload(
    orderId: string,
    clientId: string,
    files: Express.Multer.File[],
  ) {
    const order = await this.repository.findOrderById(orderId);

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
      validateImageFile(file.originalname, file.buffer);
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
    return this.repository.uploadPhotos(
      orderId,
      webpBuffers,
      (fileName, buffer, mimeType) =>
        this.minio.uploadFile(fileName, buffer, mimeType),
    );
  }

  async getViewUrl(photoId: string, userId: string, role: string) {
    const photo = await this.repository.findPhotoWithOrderById(photoId);

    if (!photo || !photo.serviceOrder) {
      throw new NotFoundException("Foto não encontrada");
    }

    const order = photo.serviceOrder;

    if (role === "ADMIN" || order.clientId === userId) {
      return this.buildViewResponse(photo.url);
    }

    if (role === "PROVIDER") {
      const proposal = await this.repository.findProposalForViewer(
        order.id,
        userId,
      );

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

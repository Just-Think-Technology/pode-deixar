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

// Teto de pixels aceito pelo sharp (anti bomba de descompressão):
// ~25MP cobre fotos de celular sem estourar memória no worker.
const LIMITE_PIXELS_SHARP = 25_000_000;

const TIPOS_IMAGEM_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Confere os magic bytes do conteúdo contra o mimetype declarado
// (o mimetype do multipart é informado pelo cliente e não é confiável).
function conteudoImagemValido(buffer: Buffer, mimetype: string): boolean {
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
    const cabecalho = buffer.subarray(0, 6).toString("ascii");
    return cabecalho === "GIF87a" || cabecalho === "GIF89a";
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

    // Fotos só podem ser enviadas enquanto o pedido está aberto (antes de
    // propostas/contratação/conclusão): evita anexar conteúdo a pedidos
    // que já saíram da vitrine.
    if (order.status !== "OPEN") {
      throw new BadRequestException(
        "Só é possível enviar fotos para pedidos com status aberto",
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException("Nenhuma foto enviada");
    }

    if (files.length > 10) {
      throw new BadRequestException("Máximo de 10 fotos por upload");
    }

    for (const file of files) {
      if (!TIPOS_IMAGEM_PERMITIDOS.includes(file.mimetype)) {
        throw new BadRequestException(
          `Tipo de arquivo inválido: ${file.mimetype}. Apenas imagens são permitidas (jpeg, png, webp, gif)`,
        );
      }

      if (!conteudoImagemValido(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          `O conteúdo do arquivo "${file.originalname}" não corresponde a uma imagem válida (jpeg, png, webp ou gif)`,
        );
      }
    }

    const webpBuffers: Buffer[] = [];

    for (const file of files) {
      try {
        const webpBuffer = await sharp(file.buffer, {
          limitInputPixels: LIMITE_PIXELS_SHARP,
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

    // Cota (máx. 10 fotos por pedido) e criações na mesma transação para
    // impedir estouro da cota sob uploads concorrentes.
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
        // eslint-disable-next-line security/detect-object-injection
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
          // Endpoint autenticado (bucket privado): mesma convenção do detalhe.
          url: `/api/services/photos/${photo.id}/view`,
          created_at: photo.createdAt,
        });
      }

      return uploaded;
    });
  }

  // URL temporária de visualização de uma foto do pedido. Autorização:
  // cliente dono do pedido, prestador com proposta no pedido ou ADMIN.
  async obterUrlVisualizacao(photoId: string, userId: string, role: string) {
    const foto = await this.prisma.orderPhoto.findUnique({
      where: { id: photoId },
      include: {
        serviceOrder: { select: { id: true, clientId: true } },
      },
    });

    if (!foto || !foto.serviceOrder) {
      throw new NotFoundException("Foto não encontrada");
    }

    const ordem = foto.serviceOrder;

    if (role === "ADMIN" || ordem.clientId === userId) {
      return this.gerarRespostaVisualizacao(foto.url);
    }

    if (role === "PROVIDER") {
      const proposta = await this.prisma.proposal.findFirst({
        where: { serviceOrderId: ordem.id, providerId: userId },
        select: { id: true },
      });

      if (proposta) {
        return this.gerarRespostaVisualizacao(foto.url);
      }
    }

    throw new ForbiddenException("Acesso negado a esta foto");
  }

  private async gerarRespostaVisualizacao(urlArmazenada: string) {
    const nomeArquivo = this.minio.extractFileName(urlArmazenada);
    const url = await this.minio.gerarUrlTemporaria(nomeArquivo);
    return { url };
  }
}

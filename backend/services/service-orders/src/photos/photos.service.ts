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
import { validarArquivoImagem } from "@pode-deixar/validation";

// Teto de pixels aceito pelo sharp (anti bomba de descompressão):
// ~25MP cobre fotos de celular sem estourar memória no worker.
const LIMITE_PIXELS_SHARP = 25_000_000;

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

    // Array.isArray primeiro: sem ele, um `photos` não-array (ex. objeto
    // com `length` forjado) confundiria as checagens de cota abaixo (CodeQL:
    // type confusion through parameter tampering).
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

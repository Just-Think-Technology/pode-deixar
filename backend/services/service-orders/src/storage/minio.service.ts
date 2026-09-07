import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private presignClient?: Minio.Client;
  private bucket: string;
  private publicUrl: string;
  private accessKey: string;
  private secretKey: string;

  constructor(private configService: ConfigService) {
    this.bucket =
      this.configService.get<string>("MINIO_ORDER_PHOTOS_BUCKET") ||
      "order-photos";
    this.publicUrl =
      this.configService.get<string>("MINIO_PUBLIC_URL") ||
      "http://localhost:8080/api/storage";
  }

  async onModuleInit() {
    const endpoint =
      this.configService.get<string>("MINIO_ENDPOINT") || "localhost";
    const port = Number(this.configService.get<string>("MINIO_PORT")) || 9000;
    this.accessKey =
      this.configService.get<string>("MINIO_ACCESS_KEY") || "minioadmin";
    this.secretKey =
      this.configService.get<string>("MINIO_SECRET_KEY") || "minioadmin";

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async uploadFile(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    bucket?: string,
  ): Promise<string> {
    const targetBucket = bucket || this.bucket;
    await this.client.putObject(targetBucket, fileName, buffer, buffer.length, {
      "Content-Type": mimeType,
    });

    return `${this.publicUrl}/${targetBucket}/${fileName}`;
  }

  async deleteFile(fileName: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.bucket;
    await this.client.removeObject(targetBucket, fileName);
  }

  // URL temporária de leitura (o bucket não é público): expira em 15 minutos
  // por padrão para que links vazados percam a validade rapidamente.
  async gerarUrlTemporaria(
    fileName: string,
    bucket?: string,
    expiracaoSegundos = 15 * 60,
  ): Promise<string> {
    const targetBucket = bucket || this.bucket;
    const assinada = await this.clientePresign().presignedGetObject(
      targetBucket,
      fileName,
      expiracaoSegundos,
    );
    // Reanexa o prefixo do gateway (/api/storage): o Caddy o remove antes de
    // repassar ao MinIO, então o caminho assinado chega intacto e a URL é
    // alcançável pelo navegador (a assinada crua apontaria p/ o host interno).
    try {
      const u = new URL(assinada);
      const base = this.publicUrl.replace(/\/$/, "");
      return `${base}${u.pathname}${u.search}`;
    } catch {
      return assinada;
    }
  }

  // Cliente dedicado à pré-assinatura, endereçado pelo host público: o host
  // faz parte da assinatura SigV4, então assinar com o host interno
  // (minio:9000) invalidaria a URL quando buscada via gateway. O Caddy
  // preserva o Host original, logo a assinatura confere no MinIO.
  private clientePresign(): Minio.Client {
    if (!this.presignClient) {
      try {
        const base = new URL(this.publicUrl);
        const ssl = base.protocol === "https:";
        const porta = base.port ? Number(base.port) : ssl ? 443 : 80;
        this.presignClient = new Minio.Client({
          endPoint: base.hostname,
          port: porta,
          useSSL: ssl,
          accessKey: this.accessKey,
          secretKey: this.secretKey,
        });
        return this.presignClient;
      } catch {
        return this.client;
      }
    }
    return this.presignClient;
  }

  extractFileName(url: string, bucket?: string): string {
    const targetBucket = bucket || this.bucket;
    const parts = url.split(`/${targetBucket}/`);
    return parts[parts.length - 1];
  }
}

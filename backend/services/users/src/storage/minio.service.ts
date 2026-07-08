import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    this.bucket =
      this.configService.get<string>("MINIO_BUCKET") || "service-images";
    this.publicUrl =
      this.configService.get<string>("MINIO_PUBLIC_URL") ||
      "http://localhost:8080/api/storage";
  }

  async onModuleInit() {
    const endpoint =
      this.configService.get<string>("MINIO_ENDPOINT") || "localhost";
    const port = Number(this.configService.get<string>("MINIO_PORT")) || 9000;
    const accessKey =
      this.configService.get<string>("MINIO_ACCESS_KEY") || "minioadmin";
    const secretKey =
      this.configService.get<string>("MINIO_SECRET_KEY") || "minioadmin";

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey,
      secretKey,
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
  ): Promise<string> {
    await this.client.putObject(this.bucket, fileName, buffer, buffer.length, {
      "Content-Type": mimeType,
    });

    return `${this.publicUrl}/${this.bucket}/${fileName}`;
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.client.removeObject(this.bucket, fileName);
  }

  extractFileName(url: string): string {
    const parts = url.split(`/${this.bucket}/`);
    return parts[parts.length - 1];
  }
}

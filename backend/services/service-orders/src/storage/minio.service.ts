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

  extractFileName(url: string, bucket?: string): string {
    const targetBucket = bucket || this.bucket;
    const parts = url.split(`/${targetBucket}/`);
    return parts[parts.length - 1];
  }
}

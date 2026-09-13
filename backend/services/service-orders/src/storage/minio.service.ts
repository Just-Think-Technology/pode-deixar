// MinIO service — order photo storage and signed URLs

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

  // --- Public API ---

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

  // Temporary read URL (bucket is not public): 15-minute default so leaked
  // links expire quickly.
  async generateTemporaryUrl(
    fileName: string,
    bucket?: string,
    expiresInSeconds = 15 * 60,
  ): Promise<string> {
    const targetBucket = bucket || this.bucket;
    const signed = await this.getPresignClient().presignedGetObject(
      targetBucket,
      fileName,
      expiresInSeconds,
    );
    // Re-attach the gateway prefix (/api/storage): Caddy strips it before
    // proxying to MinIO, keeping the signed path intact and reachable from
    // browsers (the raw signed URL would point at the internal host).
    try {
      const u = new URL(signed);
      const base = this.publicUrl.replace(/\/$/, "");
      return `${base}${u.pathname}${u.search}`;
    } catch {
      return signed;
    }
  }

  // --- Private Helpers ---

  // Dedicated presigning client addressed by the public host: the host is part
  // of the SigV4 signature, so signing with the internal host would invalidate
  // the URL when fetched via the gateway.
  private getPresignClient(): Minio.Client {
    if (!this.presignClient) {
      try {
        const base = new URL(this.publicUrl);
        const ssl = base.protocol === "https:";
        const port = base.port ? Number(base.port) : ssl ? 443 : 80;
        this.presignClient = new Minio.Client({
          endPoint: base.hostname,
          port,
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

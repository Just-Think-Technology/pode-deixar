// MinIO module — object storage wiring

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MinioService } from "./minio.service";

@Module({

  // --- Imports ---

  imports: [ConfigModule],

  // --- Providers ---

  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

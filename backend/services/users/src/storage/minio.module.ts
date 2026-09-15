// MinIO module — global object storage wiring

import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MinioService } from "./minio.service";

@Global()
@Module({

  // --- Imports ---

  imports: [ConfigModule],

  // --- Providers ---

  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

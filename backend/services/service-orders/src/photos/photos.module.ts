// Photos module — order photo upload wiring

import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { PhotosController, PhotoViewController } from "./photos.controller";
import { PhotosService } from "./photos.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MinioModule } from "../storage/minio.module";

@Module({

  // --- Imports ---

  imports: [
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10,
      },
    }),
    PrismaModule,
    MinioModule,
  ],

  // --- Controllers ---

  controllers: [PhotosController, PhotoViewController],

  // --- Providers ---

  providers: [PhotosService],
})
export class PhotosModule {}

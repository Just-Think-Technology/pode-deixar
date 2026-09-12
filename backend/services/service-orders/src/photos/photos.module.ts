// Photos module — order photo upload wiring

import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { PhotosController, PhotoViewController } from "./photos.controller";
import { PhotosService } from "./photos.service";
import { PrismaModule } from "@pode-deixar/prisma";
import { MinioModule } from "../storage/minio.module";

import { PhotosRepository } from "./photos.repository";

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

  providers: [PhotosService, PhotosRepository],
})
export class PhotosModule {}

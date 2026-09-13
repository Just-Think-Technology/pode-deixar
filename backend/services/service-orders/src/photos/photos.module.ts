import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { PhotosController, PhotoViewController } from "./photos.controller";
import { PhotosService } from "./photos.service";
import { PhotosRepository } from "./photos.repository";
import { PrismaModule } from "@pode-deixar/prisma";
import { MinioModule } from "../storage/minio.module";

@Module({
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
  controllers: [PhotosController, PhotoViewController],
  providers: [PhotosService, PhotosRepository],
})
export class PhotosModule {}

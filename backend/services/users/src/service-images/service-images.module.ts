// Service images module — provider service photo wiring

import { Module } from "@nestjs/common";
import { ServiceImagesController } from "./service-images.controller";
import { ServiceImagesService } from "./service-images.service";
import { PrismaModule } from "@pode-deixar/prisma";

import { ServiceImagesRepository } from "./service-images.repository";
import { ImagePipeline } from "@pode-deixar/storage";
import { MinioModule } from "../storage/minio.module";

@Module({
  // --- Imports ---

  imports: [PrismaModule, MinioModule],

  // --- Controllers ---

  controllers: [ServiceImagesController],

  // --- Providers ---

  providers: [ServiceImagesService, ServiceImagesRepository, ImagePipeline],
  exports: [ServiceImagesService],
})
export class ServiceImagesModule {}

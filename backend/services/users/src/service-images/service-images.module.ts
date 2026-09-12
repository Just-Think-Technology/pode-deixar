// Service images module — provider service photo wiring

import { Module } from "@nestjs/common";
import { ServiceImagesController } from "./service-images.controller";
import { ServiceImagesService } from "./service-images.service";
import { PrismaModule } from "@pode-deixar/prisma";

import { ServiceImagesRepository } from "./service-images.repository";

@Module({

  // --- Imports ---

  imports: [PrismaModule],

  // --- Controllers ---

  controllers: [ServiceImagesController],

  // --- Providers ---

  providers: [ServiceImagesService, ServiceImagesRepository],
  exports: [ServiceImagesService],
})
export class ServiceImagesModule {}

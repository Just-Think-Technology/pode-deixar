import { Module } from "@nestjs/common";
import { ServiceImagesController } from "./service-images.controller";
import { ServiceImagesService } from "./service-images.service";
import { ServiceImagesRepository } from "./service-images.repository";
import { PrismaModule } from "@pode-deixar/prisma";

@Module({
  imports: [PrismaModule],
  controllers: [ServiceImagesController],
  providers: [ServiceImagesService, ServiceImagesRepository],
  exports: [ServiceImagesService],
})
export class ServiceImagesModule {}

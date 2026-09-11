import { Module } from "@nestjs/common";
import { ServiceImagesController } from "./service-images.controller";
import { ServiceImagesService } from "./service-images.service";
import { PrismaModule } from "@pode-deixar/prisma";

@Module({
  imports: [PrismaModule],
  controllers: [ServiceImagesController],
  providers: [ServiceImagesService],
  exports: [ServiceImagesService],
})
export class ServiceImagesModule {}

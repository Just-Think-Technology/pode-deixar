// Service orders module — order lifecycle wiring

import { Module } from "@nestjs/common";
import { ServiceOrdersService } from "./service-orders.service";
import {
  ServiceOrdersController,
  MyServiceOrdersController,
  PublicServiceOrdersController,
  ProviderReceivedOrdersController,
  ProviderOrderActionsController,
  TrackingController,
} from "./service-orders.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";
import { MinioModule } from "../storage/minio.module";

import { ServiceOrdersRepository } from "./service-orders.repository";
import { PhotosRepository } from "../photos/photos.repository";

@Module({
  // --- Imports ---

  imports: [PrismaModule, SharedModule, MinioModule],

  // --- Controllers ---

  controllers: [
    ServiceOrdersController,
    MyServiceOrdersController,
    PublicServiceOrdersController,
    ProviderReceivedOrdersController,
    ProviderOrderActionsController,
    TrackingController,
  ],

  // --- Providers ---

  providers: [ServiceOrdersService, ServiceOrdersRepository, PhotosRepository],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

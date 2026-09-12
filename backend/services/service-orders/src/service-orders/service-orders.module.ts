// Service orders module — order lifecycle wiring

import { Module } from "@nestjs/common";
import { ServiceOrdersService } from "./service-orders.service";
import {
  ServiceOrdersController,
  MyServiceOrdersController,
  PublicServiceOrdersController,
  ProviderReceivedOrdersController,
  ProviderOrderActionsController,
} from "./service-orders.controller";
import { PrismaModule } from "@pode-deixar/prisma";
import { SharedModule } from "../shared/shared.module";

import { ServiceOrdersRepository } from "./service-orders.repository";

@Module({

  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [
    ServiceOrdersController,
    MyServiceOrdersController,
    PublicServiceOrdersController,
    ProviderReceivedOrdersController,
    ProviderOrderActionsController,
  ],

  // --- Providers ---

  providers: [ServiceOrdersService, ServiceOrdersRepository],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

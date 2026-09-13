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
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

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

  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

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

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ServiceOrdersController,
    MyServiceOrdersController,
    PublicServiceOrdersController,
    ProviderReceivedOrdersController,
    ProviderOrderActionsController,
  ],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

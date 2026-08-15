import { Module } from "@nestjs/common";
import { ServiceOrdersService } from "./service-orders.service";
import {
  ServiceOrdersController,
  ProviderAgendaController,
  MyServiceOrdersController,
  PublicServiceOrdersController,
  ProviderReceivedOrdersController,
} from "./service-orders.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ServiceOrdersController,
    ProviderAgendaController,
    MyServiceOrdersController,
    PublicServiceOrdersController,
    ProviderReceivedOrdersController,
  ],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

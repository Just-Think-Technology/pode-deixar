import { Module } from "@nestjs/common";
import { ServiceOrdersService } from "./service-orders.service";
import {
  ServiceOrdersController,
  MyServiceOrdersController,
  PublicServiceOrdersController,
  ServiceOrderDetailController,
} from "./service-orders.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ServiceOrdersController,
    MyServiceOrdersController,
    PublicServiceOrdersController,
    ServiceOrderDetailController,
  ],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}

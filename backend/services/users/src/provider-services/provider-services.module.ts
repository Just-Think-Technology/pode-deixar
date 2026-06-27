import { Module } from "@nestjs/common";
import { ProviderServicesService } from "./provider-services.service";
<<<<<<< HEAD
import {
  ProviderServicesController,
  PublicProviderServicesController,
  ProviderServiceDetailController,
  ProviderSearchController,
} from "./provider-services.controller";
=======
import { ProviderServicesController } from "./provider-services.controller";
import { PublicProviderServicesController } from "./provider-services.controller";
import { ProviderServiceDetailController } from "./provider-services.controller";
>>>>>>> 68d7f77 (Develop (#13))
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    ProviderServicesController,
    PublicProviderServicesController,
    ProviderServiceDetailController,
<<<<<<< HEAD
    ProviderSearchController,
=======
>>>>>>> 68d7f77 (Develop (#13))
  ],
  providers: [ProviderServicesService],
  exports: [ProviderServicesService],
})
export class ProviderServicesModule {}

// Profiles module — client and provider profile wiring

import { Module } from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { ProfilesController } from "./profiles.controller";
import { PublicProviderProfileController } from "./public-provider-profile.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({

  // --- Imports ---

  imports: [PrismaModule, SharedModule],

  // --- Controllers ---

  controllers: [ProfilesController, PublicProviderProfileController],

  // --- Providers ---

  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}

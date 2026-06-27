import { Module } from "@nestjs/common";
import { ProfilesService } from "./profiles.service";
import { ProfilesController } from "./profiles.controller";
<<<<<<< HEAD
import { PublicProviderProfileController } from "./public-provider-profile.controller";
=======
>>>>>>> 68d7f77 (Develop (#13))
import { PrismaModule } from "../prisma/prisma.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [PrismaModule, SharedModule],
<<<<<<< HEAD
  controllers: [ProfilesController, PublicProviderProfileController],
=======
  controllers: [ProfilesController],
>>>>>>> 68d7f77 (Develop (#13))
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}

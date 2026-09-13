// Notifications module — user notification wiring

import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({

  // --- Imports ---

  imports: [PrismaModule],

  // --- Controllers ---

  controllers: [NotificationsController],

  // --- Providers ---

  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

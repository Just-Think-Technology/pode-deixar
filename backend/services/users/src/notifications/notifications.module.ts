// Notifications module — user notification wiring

import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PrismaModule } from "@pode-deixar/prisma";

import { NotificationsRepository } from "./notifications.repository";

@Module({
  // --- Imports ---

  imports: [PrismaModule],

  // --- Controllers ---

  controllers: [NotificationsController],

  // --- Providers ---

  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
